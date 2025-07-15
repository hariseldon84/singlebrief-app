import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Users } from 'lucide-react';

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

interface MultiTeamSelectorProps {
  teams: Team[];
  selectedTeams: string[];
  selectedMembers: string[];
  manualMembers: ManualMember[];
  onTeamSelect: (teamId: string, selected: boolean) => void;
  onMemberToggle: (email: string, selected: boolean) => void;
  onManualMembersChange: (members: ManualMember[]) => void;
}

export function MultiTeamSelector({
  teams,
  selectedTeams,
  selectedMembers,
  manualMembers,
  onTeamSelect,
  onMemberToggle,
  onManualMembersChange
}: MultiTeamSelectorProps) {
  const addManualMember = () => {
    onManualMembersChange([...manualMembers, { name: '', email: '', department: '', topic: '' }]);
  };

  const updateManualMember = (index: number, field: keyof ManualMember, value: string) => {
    const updated = [...manualMembers];
    updated[index] = { ...updated[index], [field]: value };
    onManualMembersChange(updated);
  };

  const removeManualMember = (index: number) => {
    onManualMembersChange(manualMembers.filter((_, i) => i !== index));
  };

  const getTeamMembers = (team: Team) => {
    if (team.member_details && team.member_details.length > 0) {
      return team.member_details;
    }
    return team.members.map(email => ({
      name: '',
      email,
      designation: '',
      topics: []
    }));
  };

  return (
    <Tabs defaultValue="teams" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="teams">Select from Teams</TabsTrigger>
        <TabsTrigger value="manual">Manual Entry</TabsTrigger>
      </TabsList>
      
      <TabsContent value="teams" className="space-y-4">
        <div className="space-y-4">
          {teams.map((team) => {
            const isTeamSelected = selectedTeams.includes(team.id);
            const teamMembers = getTeamMembers(team);
            
            return (
              <Card key={team.id} className={isTeamSelected ? 'ring-2 ring-accent' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={isTeamSelected}
                      onCheckedChange={(checked) => onTeamSelect(team.id, !!checked)}
                    />
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <CardTitle className="text-base">{team.name}</CardTitle>
                      <span className="text-sm text-muted-foreground">({teamMembers.length} members)</span>
                    </div>
                  </div>
                </CardHeader>
                
                {isTeamSelected && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Select Members:</Label>
                      <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                        {teamMembers.map((member, index) => (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-muted rounded">
                            <Checkbox
                              checked={selectedMembers.includes(member.email)}
                              onCheckedChange={(checked) => onMemberToggle(member.email, !!checked)}
                            />
                            <div className="flex-1 text-sm">
                              <div className="font-medium">{member.name || member.email}</div>
                              {member.designation && (
                                <div className="text-muted-foreground text-xs">{member.designation}</div>
                              )}
                              {member.topics.length > 0 && (
                                <div className="text-muted-foreground text-xs">
                                  Topics: {member.topics.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
        
        {teams.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No teams available. Create teams first to use this feature.
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="manual" className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Manual Member Entry</Label>
          <Button type="button" onClick={addManualMember} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Person
          </Button>
        </div>
        
        {manualMembers.map((member, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-sm">Person {index + 1}</span>
                <Button
                  type="button"
                  onClick={() => removeManualMember(index)}
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Full Name</Label>
                  <Input
                    value={member.name}
                    onChange={(e) => updateManualMember(index, 'name', e.target.value)}
                    placeholder="John Doe"
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={member.email}
                    onChange={(e) => updateManualMember(index, 'email', e.target.value)}
                    placeholder="john@company.com"
                    className="text-sm"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Department</Label>
                  <Input
                    value={member.department}
                    onChange={(e) => updateManualMember(index, 'department', e.target.value)}
                    placeholder="Engineering"
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Topic/Expertise</Label>
                  <Input
                    value={member.topic}
                    onChange={(e) => updateManualMember(index, 'topic', e.target.value)}
                    placeholder="Backend Development"
                    className="text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {manualMembers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No people added yet. Click "Add Person" to start.
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}