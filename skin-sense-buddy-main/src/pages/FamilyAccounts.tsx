import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserPlus, Users, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FamilyMember {
  id: string;
  child_user_id: string;
  relationship: string;
  created_at: string;
  profiles: any;
}

export default function FamilyAccounts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [maxMembers, setMaxMembers] = useState(1);
  const [adding, setAdding] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRelationship, setNewMemberRelationship] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check subscription access
      const { data: subData } = await supabase
        .from("subscriptions")
        .select(`
          *,
          subscription_plans (max_family_members)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      const maxFamilyMembers = subData?.subscription_plans?.max_family_members || 1;
      setMaxMembers(maxFamilyMembers);
      setHasAccess(maxFamilyMembers > 1);

      // Load family members
      const { data: membersData, error: membersError } = await supabase
        .from("family_accounts")
        .select(`
          *,
          profiles!family_accounts_child_user_id_fkey (full_name, age)
        `)
        .eq("parent_user_id", user.id);

      if (membersError) throw membersError;
      setFamilyMembers(membersData || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail || !newMemberName || !newMemberRelationship) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (familyMembers.length >= maxMembers - 1) {
      toast({
        title: "Limit reached",
        description: `Your plan allows up to ${maxMembers} members`,
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create user account for family member
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newMemberEmail,
        password: Math.random().toString(36).slice(-8),
        options: {
          data: { full_name: newMemberName },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Create family relationship
      const { error: familyError } = await supabase
        .from("family_accounts")
        .insert({
          parent_user_id: user.id,
          child_user_id: authData.user.id,
          relationship: newMemberRelationship,
        });

      if (familyError) throw familyError;

      toast({
        title: "Family member added",
        description: `${newMemberName} has been added to your family account`,
      });

      setNewMemberEmail("");
      setNewMemberName("");
      setNewMemberRelationship("");
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast({
        title: "Failed to add member",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("family_accounts")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Member removed",
        description: "Family member has been removed from your account",
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <Card className="text-center p-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Upgrade to Family Plan</h2>
            <p className="text-muted-foreground mb-6">
              Manage your family's skin health all in one place with our Family Plan
            </p>
            <Button onClick={() => navigate("/subscription")}>
              View Subscription Plans
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4 sm:mb-6 text-xs sm:text-sm">
          <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">Family Accounts</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Manage up to {maxMembers} family members ({familyMembers.length + 1}/{maxMembers} used)
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={familyMembers.length >= maxMembers - 1} className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Family Member</DialogTitle>
                <DialogDescription>
                  Create a new account for your family member
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="relationship">Relationship</Label>
                  <Select value={newMemberRelationship} onValueChange={setNewMemberRelationship}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" disabled={adding} onClick={handleAddMember}>
                  {adding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Member"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {familyMembers.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                      <AvatarFallback className="text-xs sm:text-sm">
                        {member.profiles?.full_name?.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base truncate">{member.profiles?.full_name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground capitalize">{member.relationship}</p>
                      {member.profiles?.age && (
                        <p className="text-xs sm:text-sm text-muted-foreground">{member.profiles.age} years old</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-8 w-8 p-0"
                    onClick={() => handleRemoveMember(member.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
