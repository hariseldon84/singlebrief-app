import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, FileStack, Edit, Trash2, Crown, Globe, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { TemplateEditModal } from '@/components/templates/TemplateEditModal';

interface Template {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  is_system: boolean;
  is_public: boolean;
  created_at: string;
}

export default function Templates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    prompt: '',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('brief_templates')
        .select('*')
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('brief_templates')
        .insert({
          user_id: user?.id,
          name: formData.name,
          description: formData.description,
          prompt: formData.prompt,
        });

      if (error) throw error;
      
      toast({
        title: "Template created",
        description: "Your new template has been created successfully.",
      });

      setFormData({ name: '', description: '', prompt: '' });
      setIsCreateDialogOpen(false);
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('brief_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      
      toast({
        title: "Template deleted",
        description: "The template has been deleted successfully.",
      });
      
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', prompt: '' });
  };

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    template.prompt.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const userTemplates = filteredTemplates.filter(t => !t.is_system);
  const systemTemplates = filteredTemplates.filter(t => t.is_system);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sora text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground font-inter mt-2">
            Use pre-built templates or create your own for consistent briefings
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={resetForm}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-sora">Create New Template</DialogTitle>
              <DialogDescription className="font-inter">
                Create a new template to reuse for future briefs.
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
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="font-inter"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
                >
                  Create Template
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 font-inter"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* System Templates */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Crown className="h-5 w-5 text-accent" />
              <h2 className="font-sora text-xl font-semibold">System Templates</h2>
              <Badge variant="secondary" className="font-inter">Built-in</Badge>
            </div>
            <div className="grid gap-4">
              {systemTemplates.map((template) => (
                <Card 
                  key={template.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleTemplateClick(template)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <FileStack className="h-5 w-5 text-accent" />
                        <div>
                          <CardTitle className="font-sora">{template.name}</CardTitle>
                          {template.description && (
                            <CardDescription className="font-inter mt-1">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="font-inter">
                          <Crown className="h-3 w-3 mr-1" />
                          System
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground font-inter line-clamp-3">
                      {template.prompt}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* User Templates */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <FileStack className="h-5 w-5 text-foreground" />
              <h2 className="font-sora text-xl font-semibold">Your Templates</h2>
            </div>
            {userTemplates.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileStack className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-sora text-lg font-semibold mb-2">No custom templates yet</h3>
                  <p className="text-muted-foreground font-inter mb-4">
                    Create your first custom template to reuse for future briefs
                  </p>
                  <Button 
                    onClick={() => {
                      resetForm();
                      setIsCreateDialogOpen(true);
                    }}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {userTemplates.map((template) => (
                  <Card 
                    key={template.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleTemplateClick(template)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <FileStack className="h-5 w-5 text-foreground" />
                          <div>
                            <CardTitle className="font-sora">{template.name}</CardTitle>
                            {template.description && (
                              <CardDescription className="font-inter mt-1">
                                {template.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template.id);
                            }}
                            className="font-inter text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground font-inter line-clamp-3">
                        {template.prompt}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <TemplateEditModal
        template={selectedTemplate}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={fetchTemplates}
      />
    </div>
  );
}
