
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  prompt: string;
  description?: string;
  is_system: boolean;
  user_id?: string;
}

interface TemplateEditModalProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TemplateEditModal({ template, open, onOpenChange, onSuccess }: TemplateEditModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
  });

  useEffect(() => {
    if (template && open) {
      setFormData({
        name: template.name,
        description: template.description || '',
        prompt: template.prompt,
      });
    }
  }, [template, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !template) return;

    setLoading(true);
    try {
      if (template.is_system) {
        // Create a new template based on the system template
        const { error } = await supabase
          .from('brief_templates')
          .insert({
            user_id: user.id,
            name: formData.name,
            description: formData.description,
            prompt: formData.prompt,
            is_system: false,
            is_public: false,
          });

        if (error) throw error;

        toast({
          title: "Template created",
          description: "System template has been copied to your templates.",
        });
      } else {
        // Update existing user template
        const { error } = await supabase
          .from('brief_templates')
          .update({
            name: formData.name,
            description: formData.description,
            prompt: formData.prompt,
          })
          .eq('id', template.id);

        if (error) throw error;

        toast({
          title: "Template updated",
          description: "Your template has been updated successfully.",
        });
      }

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

  const isSystemTemplate = template?.is_system;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-sora">
            {isSystemTemplate ? 'Copy System Template' : 'Edit Template'}
          </DialogTitle>
          <DialogDescription className="font-inter">
            {isSystemTemplate 
              ? 'Create a copy of this system template that you can customize.'
              : 'Update your template details and content.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-inter">Template Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="font-inter"
              placeholder="e.g., Weekly Check-in, Project Feedback"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-inter">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="font-inter"
              placeholder="Brief description of this template"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt" className="font-inter">Prompt</Label>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              required
              className="font-inter min-h-32"
              placeholder="The main question or prompt for this template..."
            />
            <p className="text-sm text-muted-foreground font-inter">
              This will be the main question the AI asks team members during their conversation.
            </p>
          </div>

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
              {loading 
                ? (isSystemTemplate ? 'Copying...' : 'Updating...') 
                : (isSystemTemplate ? 'Copy Template' : 'Update Template')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
