
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  is_system: boolean;
  is_public: boolean;
  created_at: string;
}

interface TemplateEditModalProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TemplateEditModal({ template, open, onOpenChange, onSuccess }: TemplateEditModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        prompt: template.prompt,
      });
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;
    
    setLoading(true);
    try {
      if (template.is_system) {
        // For system templates, create a copy
        const { error } = await supabase
          .from('brief_templates')
          .insert({
            name: formData.name,
            description: formData.description,
            prompt: formData.prompt,
            is_system: false,
            is_public: false,
          });

        if (error) throw error;
        
        toast({
          title: "Template copied",
          description: "System template has been copied to your templates.",
        });
      } else {
        // For user templates, update directly
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

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-sora">
            {template.is_system ? 'Copy System Template' : 'Edit Template'}
          </DialogTitle>
          <DialogDescription className="font-inter">
            {template.is_system 
              ? 'Create a copy of this system template that you can customize.'
              : 'Update your template details and prompt.'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-inter">Template Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="font-inter"
              placeholder="e.g., Weekly Check-in, Project Review"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="font-inter">Description (Optional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="font-inter"
              placeholder="Brief description of when to use this template"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="prompt" className="font-inter">Prompt</Label>
            <Textarea
              id="prompt"
              value={formData.prompt}
              onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
              required
              className="font-inter min-h-32"
              placeholder="Write the question or prompt that will be used to guide the AI conversation with team members..."
            />
            <p className="text-sm text-muted-foreground font-inter">
              This will be the main question the AI asks team members during their conversation.
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
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
              {loading ? (template.is_system ? 'Copying...' : 'Updating...') : (template.is_system ? 'Copy Template' : 'Update Template')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
