import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Calendar, Clock, Users, Mail, Trash2, FileText, MessageSquare } from 'lucide-react';
import { BriefResponsesView } from './BriefResponsesView';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Brief {
  id: string;
  title: string;
  prompt: string;
  status: string;
  recipients: string[];
  response_count: number;
  total_recipients: number;
  created_at: string;
  deadline?: string;
}

interface BriefDetailModalProps {
  brief: Brief | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export function BriefDetailModal({ brief, open, onOpenChange, onDeleted }: BriefDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [responsesViewOpen, setResponsesViewOpen] = useState(false);
  const { toast } = useToast();

  if (!brief) return null;

  const getStatusBadge = (status: string) => {
    const configs = {
      draft: { label: 'Draft', variant: 'secondary' as const },
      sent: { label: 'Sent', variant: 'default' as const },
      in_progress: { label: 'In Progress', variant: 'default' as const },
      completed: { label: 'Completed', variant: 'default' as const },
      archived: { label: 'Archived', variant: 'secondary' as const },
    };
    
    const config = configs[status as keyof typeof configs] || configs.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Call edge function to send cancellation emails
      const { error: emailError } = await supabase.functions.invoke('send-brief-cancellation', {
        body: {
          briefId: brief.id,
          briefTitle: brief.title,
          recipients: brief.recipients
        }
      });

      if (emailError) {
        console.error('Error sending cancellation emails:', emailError);
        // Continue with deletion even if email fails
      }

      // Delete the brief
      const { error: deleteError } = await supabase
        .from('briefs')
        .delete()
        .eq('id', brief.id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Brief deleted',
        description: 'The brief has been deleted and team members have been notified.',
      });

      onDeleted();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting brief:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete the brief. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const progressPercentage = brief.total_recipients > 0 
    ? Math.round((brief.response_count / brief.total_recipients) * 100) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-sora text-xl">{brief.title}</DialogTitle>
            {getStatusBadge(brief.status)}
          </div>
          <DialogDescription className="font-inter">
            Created on {new Date(brief.created_at).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Brief Details */}
          <Card>
            <CardHeader>
              <CardTitle className="font-sora flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Brief Question
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-inter text-sm leading-relaxed">{brief.prompt}</p>
            </CardContent>
          </Card>

          {/* Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="font-sora flex items-center gap-2">
                <Users className="h-5 w-5" />
                Response Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-inter">
                  <span>{brief.response_count} of {brief.total_recipients} responses</span>
                  <span>{progressPercentage}% complete</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-accent h-2 rounded-full transition-all" 
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="font-sora flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm font-inter">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(brief.created_at).toLocaleDateString()}</span>
                </div>
                {brief.deadline && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Deadline:</span>
                    <span>{new Date(brief.deadline).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card>
            <CardHeader>
              <CardTitle className="font-sora flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Recipients ({brief.recipients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {brief.recipients.map((email, index) => (
                  <div key={index} className="text-sm font-inter p-2 bg-muted rounded">
                    {email}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setResponsesViewOpen(true)}
              className="font-inter"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              View Responses & Summary
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="font-inter">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Brief
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-sora">Delete Brief</AlertDialogTitle>
                  <AlertDialogDescription className="font-inter">
                    Are you sure you want to delete "{brief.title}"? This action cannot be undone.
                    All team members will be automatically notified that this brief has been cancelled.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="font-inter">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-inter"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Brief'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
      
      {/* Responses View Modal */}
      {brief && (
        <BriefResponsesView
          briefId={brief.id}
          open={responsesViewOpen}
          onOpenChange={setResponsesViewOpen}
        />
      )}
    </Dialog>
  );
}