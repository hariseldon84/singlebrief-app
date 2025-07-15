
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Users, Clock, CheckCircle, Activity } from 'lucide-react';
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

interface ActivityItem {
  id: string;
  type: 'response_submitted' | 'brief_completed' | 'brief_created';
  description: string;
  brief_id?: string;
  created_at: string;
  user_name?: string;
  brief_title?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewBriefModal, setShowNewBriefModal] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [showBriefDetail, setShowBriefDetail] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRecentBriefs();
      fetchRecentActivities();
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

  const fetchRecentActivities = async () => {
    try {
      // Fetch recent activities (this is a mock implementation)
      // In a real app, you'd have an activities table
      const mockActivities: ActivityItem[] = [
        {
          id: '1',
          type: 'response_submitted',
          description: 'John Doe submitted a response to Weekly Team Check-in',
          brief_id: 'brief-1',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          user_name: 'John Doe',
          brief_title: 'Weekly Team Check-in'
        },
        {
          id: '2',
          type: 'brief_completed',
          description: 'Project Status Update summary is completed',
          brief_id: 'brief-2',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          brief_title: 'Project Status Update'
        },
        {
          id: '3',
          type: 'brief_created',
          description: 'New brief "Q4 Planning" was created',
          brief_id: 'brief-3',
          created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          brief_title: 'Q4 Planning'
        },
        {
          id: '4',
          type: 'response_submitted',
          description: 'Sarah Smith submitted a response to Product Feedback',
          brief_id: 'brief-4',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          user_name: 'Sarah Smith',
          brief_title: 'Product Feedback'
        }
      ];
      
      setActivities(mockActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const handleStatClick = (filterType: string) => {
    navigate('/briefs', { state: { filter: filterType } });
  };

  const handleActivityClick = (activity: ActivityItem) => {
    if (activity.brief_id) {
      // In a real implementation, you'd fetch the brief details and show the modal
      // For now, navigate to briefs page
      navigate('/briefs');
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'response_submitted':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'brief_completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'brief_created':
        return <Plus className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatActivityTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
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
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleStatClick('all')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium font-inter">Total Briefs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-sora">{briefs.length}</div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleStatClick('active')}
        >
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

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleStatClick('completed')}
        >
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Briefs */}
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

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="font-sora flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription className="font-inter">
              Latest updates from your briefs and team responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-inter">No recent activity yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleActivityClick(activity)}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-inter text-foreground">
                        {activity.description}
                      </p>
                      <p className="text-xs text-muted-foreground font-inter mt-1">
                        {formatActivityTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
