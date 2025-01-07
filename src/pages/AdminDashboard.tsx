import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import NFCCodeManagement from "@/components/admin/NFCCodeManagement";
import ReviewCodeManagement from "@/components/admin/ReviewCodeManagement";
import RecentActivatedCodesCard from "@/components/admin/RecentActivatedCodesCard";

type UserWithRole = {
  id: string;
  email: string | null;
  role: Database["public"]["Enums"]["app_role"] | null;
};

export type NFCCode = {
  id: string;
  code: string;
  created_at: string;
  assigned_to: string | null;
  assigned_at: string | null;
  url: string | null;
  is_hidden: boolean | null;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isGeneratingNFC, setIsGeneratingNFC] = useState(false);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);

  // Fetch user role
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");
      
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      return roles?.role;
    },
  });

  // Fetch all users with their roles
  const { data: users, isLoading: usersLoading } = useQuery<UserWithRole[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          id,
          email
        `);

      if (error) throw error;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      return (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          role: userRole?.role || null
        };
      });
    },
    enabled: userRole === "admin",
  });

  // Fetch NFC codes
  const { data: nfcCodes, isLoading: codesLoading } = useQuery({
    queryKey: ["nfcCodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nfc_codes")
        .select("*")
        .eq('type', 'profile')
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as NFCCode[];
    },
    enabled: userRole === "admin",
  });

  // Fetch Review codes
  const { data: reviewCodes, isLoading: reviewCodesLoading } = useQuery({
    queryKey: ["reviewCodes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nfc_codes")
        .select("*")
        .eq('type', 'review')
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as NFCCode[];
    },
    enabled: userRole === "admin",
  });

  // Generate NFC codes mutation
  const generateNFCCodesMutation = useMutation({
    mutationFn: async (count: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .rpc('generate_nfc_codes', { 
          count: count,
          admin_id: user.id,
          code_type: 'profile'
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nfcCodes"] });
      toast.success("NFC codes generated successfully");
    },
    onError: (error) => {
      console.error("Error generating codes:", error);
      toast.error("Failed to generate NFC codes");
    },
    onSettled: () => {
      setIsGeneratingNFC(false);
    },
  });

  // Generate Review codes mutation
  const generateReviewCodesMutation = useMutation({
    mutationFn: async (count: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .rpc('generate_nfc_codes', { 
          count: count,
          admin_id: user.id,
          code_type: 'review'
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviewCodes"] });
      toast.success("Review codes generated successfully");
    },
    onError: (error) => {
      console.error("Error generating codes:", error);
      toast.error("Failed to generate review codes");
    },
    onSettled: () => {
      setIsGeneratingReview(false);
    },
  });

  const handleGenerateNFCCodes = async (count: number) => {
    setIsGeneratingNFC(true);
    generateNFCCodesMutation.mutate(count);
  };

  const handleGenerateReviewCodes = async (count: number) => {
    setIsGeneratingReview(true);
    generateReviewCodesMutation.mutate(count);
  };

  const handleDownloadCSV = (codes: NFCCode[], prefix: string) => {
    if (!codes) return;

    const availableCodes = codes.filter(code => !code.assigned_to);
    const csvContent = [
      ["Code", "URL", "Created At"],
      ...availableCodes.map(code => [
        code.code,
        code.url,
        new Date(code.created_at).toLocaleDateString()
      ])
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", `${prefix}-codes-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  useEffect(() => {
    if (!roleLoading && userRole !== "admin") {
      navigate("/dashboard");
    }
  }, [roleLoading, userRole, navigate]);

  if (roleLoading || usersLoading || codesLoading || reviewCodesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        
        <div className="grid gap-6 md:grid-cols-2">
          <NFCCodeManagement
            nfcCodes={nfcCodes || []}
            isGenerating={isGeneratingNFC}
            onGenerateCodes={handleGenerateNFCCodes}
            onDownloadCSV={() => handleDownloadCSV(nfcCodes || [], 'nfc')}
          />

          <ReviewCodeManagement
            reviewCodes={reviewCodes || []}
            isGenerating={isGeneratingReview}
            onGenerateCodes={handleGenerateReviewCodes}
            onDownloadCSV={() => handleDownloadCSV(reviewCodes || [], 'review')}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users?.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Role: {user.role || "user"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {nfcCodes && (
            <RecentActivatedCodesCard codes={nfcCodes} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
