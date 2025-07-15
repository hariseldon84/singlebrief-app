
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { TwoFactorSetup } from '@/components/settings/TwoFactorSetup';

type NotificationPreferences = {
  weekly_summary: boolean;
  response_alerts: boolean;
  deadline_reminders: boolean;
};

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar_url: '',
    notification_preferences: {
      weekly_summary: false,
      response_alerts: true,
      deadline_reminders: true,
    } as NotificationPreferences,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data);
        
        // Handle notification_preferences with proper type checking
        let notificationPrefs: NotificationPreferences = {
          weekly_summary: false,
          response_alerts: true,
          deadline_reminders: true,
        };
        
        if (data.notification_preferences && typeof data.notification_preferences === 'object' && !Array.isArray(data.notification_preferences)) {
          const prefs = data.notification_preferences as Record<string, any>;
          notificationPrefs = {
            weekly_summary: Boolean(prefs.weekly_summary),
            response_alerts: Boolean(prefs.response_alerts),
            deadline_reminders: Boolean(prefs.deadline_reminders),
          };
        }
        
        setFormData({
          name: data.name || '',
          email: data.email || user?.email || '',
          avatar_url: data.avatar_url || '',
          notification_preferences: notificationPrefs,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));

      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const updateData = {
        user_id: user.id,
        name: formData.name,
        email: formData.email,
        avatar_url: formData.avatar_url,
        notification_preferences: formData.notification_preferences,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updateData);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

      fetchProfile();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handle2FASuccess = () => {
    setShow2FA(false);
    fetchProfile();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-sora text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground font-inter mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-sora">Profile Information</CardTitle>
            <CardDescription className="font-inter">
              Update your personal information and avatar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={formData.avatar_url} alt="Profile" />
                <AvatarFallback className="text-lg">
                  {formData.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Label htmlFor="avatar" className="sr-only">Choose avatar</Label>
                <div className="flex items-center space-x-2">
                  <input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('avatar')?.click()}
                    disabled={uploading}
                    className="font-inter"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground font-inter">
                  Choose a new avatar image (JPG, PNG, GIF)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-inter">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="font-inter"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="font-inter">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="font-inter"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit"
                disabled={loading}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-sora">Notification Preferences</CardTitle>
            <CardDescription className="font-inter">
              Customize your notification settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="weekly_summary" className="font-inter">Weekly Summary</Label>
              <Switch 
                id="weekly_summary"
                checked={formData.notification_preferences.weekly_summary}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  notification_preferences: { ...prev.notification_preferences, weekly_summary: checked }
                }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="response_alerts" className="font-inter">Response Alerts</Label>
              <Switch 
                id="response_alerts"
                checked={formData.notification_preferences.response_alerts}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  notification_preferences: { ...prev.notification_preferences, response_alerts: checked }
                }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="deadline_reminders" className="font-inter">Deadline Reminders</Label>
              <Switch 
                id="deadline_reminders"
                checked={formData.notification_preferences.deadline_reminders}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  notification_preferences: { ...prev.notification_preferences, deadline_reminders: checked }
                }))}
              />
            </div>
            <div className="flex justify-end">
              <Button 
                type="submit"
                disabled={loading}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-sora">Security</CardTitle>
            <CardDescription className="font-inter">
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline"
              onClick={() => setShowChangePassword(true)}
              className="w-full justify-start font-inter"
            >
              Change Password
            </Button>
            <Separator />
            <Button 
              variant="outline"
              onClick={() => setShow2FA(true)}
              className="w-full justify-start font-inter"
            >
              Setup Two-Factor Authentication
            </Button>
          </CardContent>
        </Card>
      </form>

      <ChangePasswordModal
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
      />

      <TwoFactorSetup
        open={show2FA}
        onOpenChange={setShow2FA}
        onSuccess={handle2FASuccess}
      />
    </div>
  );
}
