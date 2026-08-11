import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, Users, TrendingUp, Loader2, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Appointment {
  id: string;
  scheduled_at: string;
  status: string;
  duration_minutes: number;
  meeting_url: string | null;
  notes: string | null;
  profiles: any;
  scans: any;
}

interface Stats {
  totalConsultations: number;
  upcomingAppointments: number;
  completedThisMonth: number;
  rating: number;
}

export default function ClinicianDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isClinician, setIsClinician] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalConsultations: 0,
    upcomingAppointments: 0,
    completedThisMonth: 0,
    rating: 0,
  });

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

      // Check if user is a clinician
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .eq("role", "clinician")
        .limit(1)
        .single();

      if (!roleData) {
        setIsClinician(false);
        setLoading(false);
        return;
      }

      setIsClinician(true);

      // Get clinician profile
      const { data: clinicianData } = await supabase
        .from("clinicians")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (clinicianData) {
        setStats({
          totalConsultations: clinicianData.total_consultations || 0,
          upcomingAppointments: 0, // Will be calculated from appointments
          completedThisMonth: 0, // Will be calculated from appointments
          rating: clinicianData.rating || 0,
        });
      }

      // Load appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select(`
          *,
          profiles!appointments_patient_user_id_fkey (full_name, age),
          scans (image_url)
        `)
        .eq("clinician_id", clinicianData.id)
        .order("scheduled_at", { ascending: true });

      if (appointmentsError) throw appointmentsError;

      setAppointments(appointmentsData || []);

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const upcoming = appointmentsData?.filter(
        (apt) => new Date(apt.scheduled_at) > now && apt.status !== "cancelled"
      ).length || 0;
      const completedThisMonth = appointmentsData?.filter(
        (apt) =>
          apt.status === "completed" &&
          new Date(apt.scheduled_at) >= startOfMonth
      ).length || 0;

      setStats((prev) => ({
        ...prev,
        upcomingAppointments: upcoming,
        completedThisMonth,
      }));
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

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus as any })
        .eq("id", appointmentId);

      if (error) throw error;

      toast({
        title: "Appointment updated",
        description: `Status changed to ${newStatus}`,
      });
      loadData();
    } catch (error: any) {
      toast({
        title: "Update failed",
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

  if (!isClinician) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="text-center p-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Clinician Access Required</h2>
            <p className="text-muted-foreground mb-6">
              This dashboard is only available to verified clinicians
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const upcomingAppointments = appointments.filter(
    (apt) => new Date(apt.scheduled_at) > new Date() && apt.status !== "cancelled"
  );

  const pastAppointments = appointments.filter(
    (apt) => new Date(apt.scheduled_at) <= new Date() || apt.status === "completed"
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Clinician Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your appointments and patient consultations
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total</CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.totalConsultations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.upcomingAppointments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.completedThisMonth}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Rating</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.rating.toFixed(1)}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex">
            <TabsTrigger value="upcoming" className="text-xs sm:text-sm">Upcoming</TabsTrigger>
            <TabsTrigger value="past" className="text-xs sm:text-sm">Past</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingAppointments.length === 0 ? (
              <Card className="text-center p-8 sm:p-12">
                <Calendar className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">No upcoming appointments</h3>
              </Card>
            ) : (
              upcomingAppointments.map((appointment) => (
                <Card key={appointment.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex gap-3 sm:gap-4 flex-1">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                          <AvatarFallback className="text-xs sm:text-sm">
                            {appointment.profiles?.full_name?.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-start justify-between sm:block">
                            <div>
                              <h4 className="font-semibold text-sm sm:text-base truncate">{appointment.profiles?.full_name}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {appointment.profiles?.age} years old
                              </p>
                            </div>
                            <Badge
                              className="sm:hidden"
                              variant={
                                appointment.status === "confirmed" ? "default" : "outline"
                              }
                            >
                              {appointment.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                              {format(new Date(appointment.scheduled_at), "PP")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                              {format(new Date(appointment.scheduled_at), "p")}
                            </div>
                          </div>
                          {appointment.scans && (
                            <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-lg overflow-hidden">
                              <img
                                src={appointment.scans.image_url}
                                alt="Patient scan"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                        <Badge
                          className="hidden sm:inline-flex"
                          variant={
                            appointment.status === "confirmed" ? "default" : "outline"
                          }
                        >
                          {appointment.status}
                        </Badge>
                        <div className="flex gap-2">
                          {appointment.status === "pending" && (
                            <Button
                              size="sm"
                              className="text-xs sm:text-sm"
                              onClick={() => handleUpdateStatus(appointment.id, "confirmed")}
                            >
                              Confirm
                            </Button>
                          )}
                          {appointment.meeting_url && (
                            <Button size="sm" variant="outline" className="text-xs sm:text-sm" asChild>
                              <a href={appointment.meeting_url} target="_blank" rel="noopener noreferrer">
                                <Video className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                Join
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastAppointments.length === 0 ? (
              <Card className="text-center p-8 sm:p-12">
                <Calendar className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg sm:text-xl font-semibold mb-2">No past appointments</h3>
              </Card>
            ) : (
              pastAppointments.map((appointment) => (
                <Card key={appointment.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex gap-3 sm:gap-4">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                          <AvatarFallback className="text-xs sm:text-sm">
                            {appointment.profiles?.full_name?.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center justify-between sm:block">
                            <h4 className="font-semibold text-sm sm:text-base truncate">{appointment.profiles?.full_name}</h4>
                            <Badge variant="secondary" className="sm:hidden text-xs">{appointment.status}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                              {format(new Date(appointment.scheduled_at), "PP")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                              {format(new Date(appointment.scheduled_at), "p")}
                            </div>
                          </div>
                          {appointment.notes && (
                            <p className="text-xs sm:text-sm mt-2 text-muted-foreground">{appointment.notes}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="hidden sm:inline-flex">{appointment.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
