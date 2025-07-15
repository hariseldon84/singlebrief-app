
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, FileText, Clock, CheckCircle, Archive, Calendar } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
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

export default function Briefs() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showNewBriefModal, setShowNewBriefModal] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);
  const [showBriefDetail, setShowBriefDetail] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBriefs();
    }
  }, [user]);

  useEffect(() => {
    // Handle filter from navigation state
    if (location.state?.filter) {
      const filterType = location.state.filter;
      switch (filterType) {
        case 'active':
          setStatusFilter('in_progress');
          break;
        case 'completed':
          setStatusFilter('completed');
          break;
        case 'all':
        default:
          setStatusFilter('all');
          break;
      }
      // Clear the navigation state
      navigate('/briefs', { replace: true });
    }
  }, [location.state, navigate]);

  const fetchBriefs = async () => {
    try {
      const { data, error } = await supabase
        .from('briefs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBriefs(data || []);
    } catch (error) {
      console.error('Error fetching briefs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBriefs = briefs.filter(brief => {
    const matchesSearch = brief.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = brief.status === 'in_progress' || brief.status === 'sent';
    } else if (statusFilter !== 'all') {
      matchesStatus = brief.status === statusFilter;
    }
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const briefDate = new Date(brief.created_at);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = briefDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = briefDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = briefDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
      case 'sent':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'archived':
        return <Archive className="h-4 w-4 text-gray-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sora text-3xl font-bold">Briefs</h1>
          <p className="text-muted-foreground font-inter mt-2">
            Manage and track all your team briefings
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

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search briefs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 font-inter"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm font-inter"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="in_progress">In Progress</option>
            <option value="active">Active (In Progress + Sent)</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm font-inter"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : filteredBriefs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-sora text-lg font-semibold mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No matching briefs' : 'No briefs yet'}
            </h3>
            <p className="text-muted-foreground font-inter mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first brief to get started with team insights'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && dateFilter === 'all' && (
              <Button 
                onClick={() => setShowNewBriefModal(true)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Brief
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBriefs.map((brief) => (
            <Card 
              key={brief.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedBrief(brief);
                setShowBriefDetail(true);
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(brief.status)}
                    <div>
                      <CardTitle className="font-sora text-lg">{brief.title}</CardTitle>
                      <CardDescription className="font-inter">
                        Created {new Date(brief.created_at).toLocaleDateString()}
                        {brief.deadline && (
                          <span> • Deadline {new Date(brief.deadline).toLocaleDateString()}</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(brief.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground font-inter">
                    <span>{brief.response_count} / {brief.total_recipients} responses</span>
                    {brief.total_recipients > 0 && (
                      <span>
                        {Math.round((brief.response_count / brief.total_recipients) * 100)}% complete
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <NewBriefModal 
        open={showNewBriefModal}
        onOpenChange={setShowNewBriefModal}
        onSuccess={fetchBriefs}
      />
      
      <BriefDetailModal
        brief={selectedBrief}
        open={showBriefDetail}
        onOpenChange={setShowBriefDetail}
        onDeleted={fetchBriefs}
      />
    </div>
  );
}
