import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Users, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { NewBriefModal } from '@/components/briefs/NewBriefModal';
import { BriefDetailModal } from '@/components/briefs/BriefDetailModal';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBriefModal, setShowNewBriefModal] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [showBriefDetail, setShowBriefDetail] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRecentBriefs();
    }
  }, [user]);

  const fetchRecentBriefs = async () => {
    try {
      const { data, error } = await supabase
        .from('briefs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setBriefs(data || []);
    } catch (error) {
      console.error('Error fetching briefs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'sent':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sora text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground font-inter mt-2">
            Welcome back! Here's what's happening with your briefs.
          </p>
        </div>
        <Button 
          onClick={() => setShowNewBriefModal(true)}
          className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Brief
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-inter">Total Briefs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sora">{briefs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-inter">Active Briefs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sora">
              {briefs.filter(b => b.status === 'in_progress' || b.status === 'sent').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-inter">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sora">
              {briefs.filter(b => b.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-sora">Recent Briefs</CardTitle>
          <CardDescription className="font-inter">
            Your most recently created briefs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          ) : briefs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-inter">No briefs yet. Create your first brief to get started!</p>
              <Button 
                onClick={() => setShowNewBriefModal(true)}
                className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Brief
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {briefs.map((brief) => (
                <div
                  key={brief.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedBrief(brief);
                    setShowBriefDetail(true);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`${getStatusColor(brief.status)}`}>
                      {getStatusIcon(brief.status)}
                    </div>
                    <div>
                      <h3 className="font-medium font-inter">{brief.title}</h3>
                      <p className="text-sm text-muted-foreground font-inter">
                        {brief.response_count} / {brief.total_recipients} responses
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium font-inter capitalize">
                      {brief.status.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-muted-foreground font-inter">
                      {new Date(brief.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NewBriefModal 
        open={showNewBriefModal}
        onOpenChange={setShowNewBriefModal}
        onSuccess={fetchRecentBriefs}
      />
      
      <BriefDetailModal
        brief={selectedBrief}
        open={showBriefDetail}
        onOpenChange={setShowBriefDetail}
        onDeleted={fetchRecentBriefs}
      />
    </div>
  );
}