
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MemberDetailsForm } from './MemberDetailsForm';

interface CreateTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTeamModal({ open, onOpenChange, onSuccess }: CreateTeamModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('detailed');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    members: [] as string[],
    memberDetails: [] as Array<{ name: string; email: string; role?: string; department?: string }>
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const teamData = {
        user_id: user.id,
        name: formData.name,
        description: formData.description,
        members: activeTab === 'simple' ? formData.members : formData.memberDetails.map(m => m.email),
        member_details: activeTab === 'detailed' ? formData.memberDetails : []
      };

      const { error } = await supabase
        .from('teams')
        .insert(teamData);

      if (error) throw error;

      toast({
        title: "Team created",
        description: "Your team has been created successfully.",
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        members: [],
        memberDetails: []
      });
      setActiveTab('detailed');
      onSuccess();
      onOpenChange(false);
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

  const addSimpleMember = () => {
    setFormData(prev => ({
      ...prev,
      members: [...prev.members, '']
    }));
  };

  const updateSimpleMember = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.map((member, i) => i === index ? value : member)
    }));
  };

  const removeSimpleMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index)
    }));
  };

  const addDetailedMember = () => {
    setFormData(prev => ({
      ...prev,
      memberDetails: [...prev.memberDetails, { name: '', email: '', role: '', department: '' }]
    }));
  };

  const updateDetailedMember = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      memberDetails: prev.memberDetails.map((member, i) => 
        i === index ? { ...member, [field]: value } : member
      )
    }));
  };

  const removeDetailedMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      memberDetails: prev.memberDetails.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-sora text-xl">Create New Team</DialogTitle>
          <DialogDescription className="font-inter">
            Create a new team to organize your brief recipients.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-inter">Team Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="font-inter w-full"
                placeholder="e.g., Product Team, Marketing Team"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-inter">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="font-inter w-full min-h-20"
                placeholder="Brief description of this team"
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="detailed">Detailed Members</TabsTrigger>
                <TabsTrigger value="simple">Simple Email List</TabsTrigger>
              </TabsList>

              <TabsContent value="detailed" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-sora">Team Members with Details</CardTitle>
                      <Button
                        type="button"
                        onClick={addDetailedMember}
                        size="sm"
                        className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {formData.memberDetails.length === 0 ? (
                      <p className="text-center text-muted-foreground font-inter py-8">
                        No members added yet. Click "Add Member" to start.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {formData.memberDetails.map((member, index) => (
                          <MemberDetailsForm
                            key={index}
                            member={member}
                            onUpdate={(field, value) => updateDetailedMember(index, field, value)}
                            onRemove={() => removeDetailedMember(index)}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="simple" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-sora">Simple Email List</CardTitle>
                      <Button
                        type="button"
                        onClick={addSimpleMember}
                        size="sm"
                        className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Email
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {formData.members.length === 0 ? (
                      <p className="text-center text-muted-foreground font-inter py-8">
                        No emails added yet. Click "Add Email" to start.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {formData.members.map((email, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              type="email"
                              value={email}
                              onChange={(e) => updateSimpleMember(index, e.target.value)}
                              placeholder="team.member@company.com"
                              className="font-inter flex-1"
                              required
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeSimpleMember(index)}
                              className="font-inter"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="font-inter"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={loading || !formData.name}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
              >
                {loading ? 'Creating...' : 'Create Team'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
