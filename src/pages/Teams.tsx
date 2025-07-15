import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, Edit, Trash2, UserCheck, Search, Calendar } from 'lucide-react';
import { MemberDetailsForm } from '@/components/teams/MemberDetailsForm';
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
  description?: string;
  members: string[];
  member_details: TeamMember[];
  created_at: string;
}

export default function Teams() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    members: '',
  });
  const [memberDetails, setMemberDetails] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process teams data to handle member_details JSON
      const processedTeams = (data || []).map(team => ({
        ...team,
        member_details: Array.isArray(team.member_details) 
          ? (team.member_details as unknown as TeamMember[])
          : []
      }));
      
      setTeams(processedTeams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const membersArray = formData.members
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    // Use member details if available, otherwise create from emails
    const memberDetailsToSave = memberDetails.length > 0 
      ? memberDetails 
      : membersArray.map(email => ({
          name: '',
          email,
          designation: '',
          topics: []
        }));

    try {
      if (editingTeam) {
        const { error } = await supabase
          .from('teams')
          .update({
            name: formData.name,
            description: formData.description,
            members: membersArray,
            member_details: memberDetailsToSave,
          })
          .eq('id', editingTeam.id);

        if (error) throw error;
        
        toast({
          title: "Team updated",
          description: "Your team has been updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('teams')
          .insert({
            user_id: user?.id,
            name: formData.name,
            description: formData.description,
            members: membersArray,
            member_details: memberDetailsToSave,
          });

        if (error) throw error;
        
        toast({
          title: "Team created",
          description: "Your new team has been created successfully.",
        });
      }

      setFormData({ name: '', description: '', members: '' });
      setMemberDetails([]);
      setIsCreateDialogOpen(false);
      setEditingTeam(null);
      fetchTeams();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      members: team.members.join(', '),
    });
    setMemberDetails(team.member_details || []);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;
      
      toast({
        title: "Team deleted",
        description: "The team has been deleted successfully.",
      });
      
      fetchTeams();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', members: '' });
    setMemberDetails([]);
    setEditingTeam(null);
  };

  const addMemberDetail = () => {
    setMemberDetails([...memberDetails, { name: '', email: '', designation: '', topics: [] }]);
  };

  const updateMemberDetail = (index: number, field: keyof TeamMember, value: string | string[]) => {
    const updated = [...memberDetails];
    updated[index] = { ...updated[index], [field]: value };
    setMemberDetails(updated);
  };

  const removeMemberDetail = (index: number) => {
    setMemberDetails(memberDetails.filter((_, i) => i !== index));
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = 
      team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team.members.some(email => email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (team.member_details || []).some(member => 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const teamDate = new Date(team.created_at);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = teamDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = teamDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = teamDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sora text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground font-inter mt-2">
            Manage your team groups for easier brief distribution
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={resetForm}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="font-sora">
                {editingTeam ? 'Edit Team' : 'Create New Team'}
              </DialogTitle>
              <DialogDescription className="font-inter">
                {editingTeam 
                  ? 'Update your team details and member list.'
                  : 'Create a new team to organize your brief recipients.'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-inter">Team Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="font-inter"
                  placeholder="e.g., Product Team, Marketing Team"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="font-inter">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="font-inter"
                  placeholder="Brief description of this team"
                />
              </div>
              
              <Tabs defaultValue="detailed" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="detailed">Detailed Members</TabsTrigger>
                  <TabsTrigger value="simple">Simple Email List</TabsTrigger>
                </TabsList>
                
                <TabsContent value="detailed" className="space-y-4">
                  <MemberDetailsForm 
                    members={memberDetails}
                    onUpdate={setMemberDetails}
                  />
                </TabsContent>
                
                <TabsContent value="simple" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="members" className="font-inter">Team Members</Label>
                    <Textarea
                      id="members"
                      value={formData.members}
                      onChange={(e) => setFormData({ ...formData, members: e.target.value })}
                      className="font-inter"
                      placeholder="Enter email addresses separated by commas&#10;e.g., john@company.com, jane@company.com"
                    />
                    <p className="text-sm text-muted-foreground font-inter">
                      Separate email addresses with commas
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
              
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
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </Button>
              </div>
            </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search teams or emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 font-inter"
          />
        </div>
        
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

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : filteredTeams.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-sora text-lg font-semibold mb-2">
              {searchTerm || dateFilter !== 'all' ? 'No matching teams' : 'No teams yet'}
            </h3>
            <p className="text-muted-foreground font-inter mb-4">
              {searchTerm || dateFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first team to organize your brief recipients'
              }
            </p>
            {!searchTerm && dateFilter === 'all' && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={resetForm}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground font-inter"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Team
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-sora">Create New Team</DialogTitle>
                  <DialogDescription className="font-inter">
                    Create a new team to organize your brief recipients.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-inter">Team Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="font-inter"
                      placeholder="e.g., Product Team, Marketing Team"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description" className="font-inter">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="font-inter"
                      placeholder="Brief description of this team"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="members" className="font-inter">Team Members</Label>
                    <Textarea
                      id="members"
                      value={formData.members}
                      onChange={(e) => setFormData({ ...formData, members: e.target.value })}
                      required
                      className="font-inter"
                      placeholder="Enter email addresses separated by commas&#10;e.g., john@company.com, jane@company.com"
                    />
                    <p className="text-sm text-muted-foreground font-inter">
                      Separate email addresses with commas
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
                      Create Team
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTeams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-accent" />
                      <div>
                        <CardTitle className="font-sora">{team.name}</CardTitle>
                        {team.description && (
                          <CardDescription className="font-inter mt-1">
                            {team.description}
                          </CardDescription>
                        )}
                        <div className="text-sm text-muted-foreground mt-1">
                          {team.member_details && team.member_details.length > 0 
                            ? `${team.member_details.length} members`
                            : `${team.members.length} members`
                          }
                        </div>
                      </div>
                    </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(team)}
                      className="font-inter"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(team.id)}
                      className="font-inter text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground font-inter">
                  <UserCheck className="h-4 w-4" />
                  <span>{team.members.length} members</span>
                </div>
                <div className="mt-2 space-y-2">
                  {team.member_details && team.member_details.length > 0 ? (
                    <div className="space-y-1">
                      {team.member_details.slice(0, 3).map((member, index) => (
                        <div key={index} className="text-xs bg-muted p-2 rounded">
                          <div className="font-medium">{member.name || member.email}</div>
                          {member.designation && (
                            <div className="text-muted-foreground">{member.designation}</div>
                          )}
                          {member.topics.length > 0 && (
                            <div className="text-muted-foreground">Topics: {member.topics.join(', ')}</div>
                          )}
                        </div>
                      ))}
                      {team.member_details.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{team.member_details.length - 3} more members
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {team.members.slice(0, 3).map((email) => (
                        <span
                          key={email}
                          className="inline-block bg-muted text-muted-foreground px-2 py-1 rounded text-xs font-inter"
                        >
                          {email}
                        </span>
                      ))}
                      {team.members.length > 3 && (
                        <span className="inline-block bg-muted text-muted-foreground px-2 py-1 rounded text-xs font-inter">
                          +{team.members.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}