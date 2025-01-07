import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { AdminDashboardContent } from "@/components/admin/AdminDashboardContent";

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

  // Fetch user role first - this is critical for access control
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ["userRole"],
    queryFn: async () => {
      console.log('Fetching user role');
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

  // Only fetch other data if user is admin
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      console.log('Fetching users');
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`id, email`);

      if (error) throw error;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      return profiles.map(profile => ({
        id: profile.id,
        email: profile.email,
        role: roles?.find(r => r.user_id === profile.id)?.role || null
      }));
    },
    enabled: userRole === "admin",
  });

  const { data: nfcCodes, isLoading: codesLoading } = useQuery({
    queryKey: ["nfcCodes"],
    queryFn: async () => {
      console.log('Fetching NFC codes');
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

  const { data: reviewCodes, isLoading: reviewCodesLoading } = useQuery({
    queryKey: ["reviewCodes"],
    queryFn: async () => {
      console.log('Fetching review codes');
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

  const handleGenerateNFCCodes = (count: number) => {
    setIsGeneratingNFC(true);
    generateNFCCodesMutation.mutate(count);
  };

  const handleGenerateReviewCodes = (count: number) => {
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

  // Show loading state only for role check
  if (roleLoading) {
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
        
        <AdminDashboardContent
          nfcCodes={nfcCodes || []}
          reviewCodes={reviewCodes || []}
          users={users || []}
          isGeneratingNFC={isGeneratingNFC}
          isGeneratingReview={isGeneratingReview}
          onGenerateNFCCodes={handleGenerateNFCCodes}
          onGenerateReviewCodes={handleGenerateReviewCodes}
          onDownloadNFCCSV={() => handleDownloadCSV(nfcCodes || [], 'nfc')}
          onDownloadReviewCSV={() => handleDownloadCSV(reviewCodes || [], 'review')}
          isLoading={{
            users: usersLoading,
            codes: codesLoading,
            reviewCodes: reviewCodesLoading,
          }}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;