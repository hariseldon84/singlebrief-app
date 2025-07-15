import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MultiTeamSelector } from './MultiTeamSelector';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  name: string;
  email: string;
  designation: string;
  topics: string[];
}

interface Team {
  id: string;
  name: string;
  members: string[];
  member_details: TeamMember[];
}

interface ManualMember {
  name: string;
  email: string;
  department: string;
  topic: string;
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
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [manualMembers, setManualMembers] = useState<ManualMember[]>([]);

  useEffect(() => {
    if (open && user) {
      fetchTeamsAndTemplates();
    }
  }, [open, user]);

  const fetchTeamsAndTemplates = async () => {
    try {
      const [teamsResponse, templatesResponse] = await Promise.all([
        supabase.from('teams').select('id, name, members, member_details').eq('user_id', user?.id),
        supabase.from('brief_templates').select('id, name, prompt').or(`user_id.eq.${user?.id},is_system.eq.true,is_public.eq.true`)
      ]);

      if (teamsResponse.error) throw teamsResponse.error;
      if (templatesResponse.error) throw templatesResponse.error;

      // Process teams data to handle member_details JSON
      const processedTeams = (teamsResponse.data || []).map(team => ({
        ...team,
        member_details: Array.isArray(team.member_details) 
          ? (team.member_details as unknown as TeamMember[])
          : []
      }));
      
      setTeams(processedTeams);
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
      // Get recipients from multiple sources
      let recipients: string[] = [];
      
      // From selected team members
      if (selectedMembers.length > 0) {
        recipients = [...recipients, ...selectedMembers];
      }
      
      // From manual members
      if (manualMembers.length > 0) {
        const manualEmails = manualMembers
          .map(member => member.email.trim())
          .filter(email => email.length > 0);
        recipients = [...recipients, ...manualEmails];
      }
      
      // From custom emails (fallback)
      if (recipients.length === 0 && formData.customEmails) {
        recipients = formData.customEmails
          .split(',')
          .map(email => email.trim())
          .filter(email => email.length > 0);
      }

      // Remove duplicates
      recipients = [...new Set(recipients)];

      if (recipients.length === 0) {
        toast({
          title: "Error",
          description: "Please select team members or enter email addresses.",
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
      setSelectedTeams([]);
      setSelectedMembers([]);
      setManualMembers([]);

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

  const handleTeamSelect = (teamId: string, selected: boolean) => {
    if (selected) {
      setSelectedTeams([...selectedTeams, teamId]);
      // Auto-select all members of the team
      const team = teams.find(t => t.id === teamId);
      if (team) {
        const teamEmails = team.member_details && team.member_details.length > 0
          ? team.member_details.map(m => m.email)
          : team.members;
        setSelectedMembers([...new Set([...selectedMembers, ...teamEmails])]);
      }
    } else {
      setSelectedTeams(selectedTeams.filter(id => id !== teamId));
      // Deselect all members of the team
      const team = teams.find(t => t.id === teamId);
      if (team) {
        const teamEmails = team.member_details && team.member_details.length > 0
          ? team.member_details.map(m => m.email)
          : team.members;
        setSelectedMembers(selectedMembers.filter(email => !teamEmails.includes(email)));
      }
    }
  };

  const handleMemberToggle = (email: string, selected: boolean) => {
    if (selected) {
      setSelectedMembers([...selectedMembers, email]);
    } else {
      setSelectedMembers(selectedMembers.filter(e => e !== email));
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
            
            <MultiTeamSelector
              teams={teams}
              selectedTeams={selectedTeams}
              selectedMembers={selectedMembers}
              manualMembers={manualMembers}
              onTeamSelect={handleTeamSelect}
              onMemberToggle={handleMemberToggle}
              onManualMembersChange={setManualMembers}
            />
            
            {/* Fallback: Custom Emails */}
            {selectedMembers.length === 0 && manualMembers.length === 0 && (
              <div className="space-y-2 border-t pt-4">
                <Label htmlFor="customEmails" className="font-inter text-sm font-normal">Or Enter Email Addresses</Label>
                <Textarea
                  id="customEmails"
                  value={formData.customEmails}
                  onChange={(e) => setFormData(prev => ({ ...prev, customEmails: e.target.value }))}
                  className="font-inter"
                  placeholder="Enter email addresses separated by commas&#10;e.g., john@company.com, jane@company.com"
                />
              </div>
            )}
            
            {/* Selected Recipients Summary */}
            {(selectedMembers.length > 0 || manualMembers.length > 0) && (
              <div className="text-sm text-muted-foreground">
                {selectedMembers.length + manualMembers.length} recipient(s) selected
              </div>
            )}
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