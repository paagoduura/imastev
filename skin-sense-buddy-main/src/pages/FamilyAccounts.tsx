import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Trash2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FamilyMember {
  id: string;
  child_user_id: string;
  relationship: string;
  created_at: string;
  profiles: any;
}

const DEFAULT_MAX_MEMBERS = 5;

export default function FamilyAccounts() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [maxMembers] = useState(DEFAULT_MAX_MEMBERS);
  const [adding, setAdding] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRelationship, setNewMemberRelationship] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: membersData, error: membersError } = await supabase
        .from("family_accounts")
        .select(`*, profiles!family_accounts_child_user_id_fkey (full_name, age)`)
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
        description: `You can add up to ${maxMembers} members`,
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

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

      const { error: familyError } = await supabase.from("family_accounts").insert({
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
      void loadData();
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
      const { error } = await supabase.from("family_accounts").delete().eq("id", memberId);
      if (error) throw error;

      toast({
        title: "Member removed",
        description: "Family member has been removed from your account",
      });

      void loadData();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4 text-xs sm:mb-6 sm:text-sm">
          <ArrowLeft className="mr-1 h-4 w-4 sm:mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-center">
          <div>
            <h1 className="mb-1 text-2xl font-bold sm:mb-2 sm:text-3xl lg:text-4xl">Family Accounts</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Manage up to {maxMembers} family members ({familyMembers.length + 1}/{maxMembers} used)
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                disabled={familyMembers.length >= maxMembers - 1}
                className="w-full bg-gradient-to-r from-amber-600 to-stone-700 text-white sm:w-auto"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Family Member</DialogTitle>
                <DialogDescription>Create a new account for your family member</DialogDescription>
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

                <Button className="w-full bg-amber-600 text-white" disabled={adding} onClick={handleAddMember}>
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
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <Avatar className="h-10 w-10 shrink-0 sm:h-12 sm:w-12">
                      <AvatarFallback className="text-xs sm:text-sm">
                        {member.profiles?.full_name?.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold sm:text-base">{member.profiles?.full_name}</h4>
                      <p className="text-xs capitalize text-muted-foreground sm:text-sm">{member.relationship}</p>
                      {member.profiles?.age && (
                        <p className="text-xs text-muted-foreground sm:text-sm">{member.profiles.age} years old</p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 p-0"
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
