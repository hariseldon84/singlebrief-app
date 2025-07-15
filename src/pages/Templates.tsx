import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { CreateTemplateModal } from '@/components/templates/CreateTemplateModal';
import { TemplateEditModal } from '@/components/templates/TemplateEditModal';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Template {
  id: string;
  name: string;
  prompt: string;
  description?: string;
  is_system: boolean;
  user_id?: string;
}

export default function Templates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [user]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('brief_templates')
        .select('*')
        .or(`user_id.eq.${user?.id},is_system.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    setShowEditModal(true);
  };

  const handleCreateTemplate = () => {
    setShowCreateModal(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('brief_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    template.prompt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sora text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground font-inter mt-2">
            Create and manage templates for your briefs
          </p>
        </div>
        <Button 
          onClick={handleCreateTemplate}
          className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="relative flex-1 max-w-sm">
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
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-sora text-lg font-semibold mb-2">
              {searchTerm ? 'No matching templates' : 'No templates yet'}
            </h3>
            <p className="text-muted-foreground font-inter mb-4">
              {searchTerm 
                ? 'Try adjusting your search'
                : 'Create your first template to streamline your brief creation process'
              }
            </p>
            {!searchTerm && (
              <Button 
                onClick={handleCreateTemplate}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card 
              key={template.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleTemplateClick(template)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-accent" />
                    <div className="flex-1">
                      <CardTitle className="font-sora text-lg">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="font-inter mt-1">
                          {template.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {template.is_system && (
                      <Badge variant="secondary" className="text-xs">
                        System
                      </Badge>
                    )}
                    {!template.is_system && template.user_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        className="font-inter text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground font-inter line-clamp-3">
                  {template.prompt}
                </p>
                <div className="flex items-center justify-between mt-4">
                  <div className="text-xs text-muted-foreground font-inter">
                    {template.is_system ? 'System Template' : 'Your Template'}
                  </div>
                  <div className="text-xs text-muted-foreground font-inter">
                    Click to {template.is_system ? 'copy' : 'edit'}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateTemplateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={fetchTemplates}
      />
      
      <TemplateEditModal
        template={selectedTemplate}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onSuccess={fetchTemplates}
      />
    </div>
  );
}
