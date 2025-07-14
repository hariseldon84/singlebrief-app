import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Team {
  id: string;
  name: string;
  members: string[];
}

interface Template {
  id: string;
  name: string;
  prompt: string;
}

interface NewBriefModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewBriefModal({ open, onOpenChange, onSuccess }: NewBriefModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    prompt: '',
    selectedTeam: '',
    customEmails: '',
    constraints: '',
    deadline: undefined as Date | undefined,
    selectedTemplate: '',
  });

  useEffect(() => {
    if (open && user) {
      fetchTeamsAndTemplates();
    }
  }, [open, user]);

  const fetchTeamsAndTemplates = async () => {
    try {
      const [teamsResponse, templatesResponse] = await Promise.all([
        supabase.from('teams').select('id, name, members').eq('user_id', user?.id),
        supabase.from('brief_templates').select('id, name, prompt').or(`user_id.eq.${user?.id},is_system.eq.true,is_public.eq.true`)
      ]);

      if (teamsResponse.error) throw teamsResponse.error;
      if (templatesResponse.error) throw templatesResponse.error;

      setTeams(teamsResponse.data || []);
      setTemplates(templatesResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        selectedTemplate: templateId,
        prompt: template.prompt,
        title: prev.title || template.name,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get recipients from selected team or custom emails
      let recipients: string[] = [];
      if (formData.selectedTeam) {
        const team = teams.find(t => t.id === formData.selectedTeam);
        recipients = team?.members || [];
      } else if (formData.customEmails) {
        recipients = formData.customEmails
          .split(',')
          .map(email => email.trim())
          .filter(email => email.length > 0);
      }

      if (recipients.length === 0) {
        toast({
          title: "Error",
          description: "Please select a team or enter email addresses.",
          variant: "destructive",
        });
        return;
      }

      // Create the brief
      const { data: brief, error: briefError } = await supabase
        .from('briefs')
        .insert({
          user_id: user?.id,
          title: formData.title,
          prompt: formData.prompt,
          recipients,
          total_recipients: recipients.length,
          deadline: formData.deadline?.toISOString(),
          status: 'draft',
        })
        .select()
        .single();

      if (briefError) throw briefError;

      // Create response records for each recipient
      const responseInserts = recipients.map(email => ({
        brief_id: brief.id,
        recipient_email: email,
        secure_token: crypto.randomUUID(),
      }));

      const { error: responsesError } = await supabase
        .from('responses')
        .insert(responseInserts);

      if (responsesError) throw responsesError;

      toast({
        title: "Brief created",
        description: "Your brief has been created successfully.",
      });

      // Reset form
      setFormData({
        title: '',
        prompt: '',
        selectedTeam: '',
        customEmails: '',
        constraints: '',
        deadline: undefined,
        selectedTemplate: '',
      });

      onOpenChange(false);
      onSuccess?.();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-sora">Create New Brief</DialogTitle>
          <DialogDescription className="font-inter">
            Create a new brief to gather insights from your team members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label className="font-inter">Start from Template (Optional)</Label>
            <Select value={formData.selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="font-inter">
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id} className="font-inter">
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="font-inter">Brief Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              className="font-inter"
              placeholder="e.g., Q4 Planning Feedback, Product Roadmap Review"
            />
          </div>

          {/* Question/Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt" className="font-inter">Brief Question</Label>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              required
              className="font-inter min-h-24"
              placeholder="What would you like to ask your team? This will guide the AI conversation with each team member."
            />
          </div>

          {/* Recipients */}
          <div className="space-y-4">
            <Label className="font-inter">Recipients</Label>
            
            {/* Team Selection */}
            <div className="space-y-2">
              <Label className="font-inter text-sm font-normal">Select from Team</Label>
              <Select 
                value={formData.selectedTeam} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, selectedTeam: value, customEmails: '' }))}
              >
                <SelectTrigger className="font-inter">
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id} className="font-inter">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>{team.name} ({team.members.length} members)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-center text-sm text-muted-foreground font-inter">OR</div>

            {/* Custom Emails */}
            <div className="space-y-2">
              <Label htmlFor="customEmails" className="font-inter text-sm font-normal">Enter Email Addresses</Label>
              <Textarea
                id="customEmails"
                value={formData.customEmails}
                onChange={(e) => setFormData(prev => ({ ...prev, customEmails: e.target.value, selectedTeam: '' }))}
                className="font-inter"
                placeholder="Enter email addresses separated by commas&#10;e.g., john@company.com, jane@company.com"
                disabled={!!formData.selectedTeam}
              />
            </div>
          </div>

          {/* Constraints */}
          <div className="space-y-2">
            <Label htmlFor="constraints" className="font-inter">Specific Constraints (Optional)</Label>
            <Textarea
              id="constraints"
              value={formData.constraints}
              onChange={(e) => setFormData(prev => ({ ...prev, constraints: e.target.value }))}
              className="font-inter"
              placeholder="Any specific instructions, focus areas, or constraints for this brief..."
            />
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label className="font-inter">Response Deadline (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal font-inter",
                    !formData.deadline && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.deadline ? format(formData.deadline, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.deadline}
                  onSelect={(date) => setFormData(prev => ({ ...prev, deadline: date }))}
                  disabled={(date) => date <= new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
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
              disabled={loading}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
            >
              {loading ? 'Creating...' : 'Create Brief'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}