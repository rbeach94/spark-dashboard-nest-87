import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PlaceSearch } from "./PlaceSearch";

export const ReviewPlaqueForm = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [placeId, setPlaceId] = useState("");
  const [placeName, setPlaceName] = useState("");

  useEffect(() => {
    const fetchPlaqueData = async () => {
      if (!code) return;

      const { data: nfcCode, error } = await supabase
        .from("nfc_codes")
        .select("*")
        .eq("code", code)
        .single();

      if (error) {
        console.error("Error fetching NFC code:", error);
        toast.error("Error loading plaque data");
        return;
      }

      if (!nfcCode) {
        toast.error("Plaque not found");
        navigate("/dashboard");
        return;
      }

      if (nfcCode.title) setTitle(nfcCode.title);
      if (nfcCode.description) setDescription(nfcCode.description);
    };

    fetchPlaqueData();
  }, [code]);

  const handlePlaceSelect = async (placeId: string, placeName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please log in to continue");
        navigate("/login");
        return;
      }

      const { data: { GOOGLE_PLACES_API_KEY }, error: secretError } = await supabase
        .functions.invoke('get-secret', {
          body: { name: 'GOOGLE_PLACES_API_KEY' }
        });

      if (secretError) {
        console.error("Error fetching API key:", secretError);
        toast.error("Error setting up review link");
        return;
      }

      const reviewUrl = `https://places.googleapis.com/v1/places/${placeId}?fields=id&key=${GOOGLE_PLACES_API_KEY}`;
      setPlaceId(placeId);
      setPlaceName(placeName);
      setTitle(`Review ${placeName}`);
      setDescription(`Please leave us a review on Google!`);
    } catch (error) {
      console.error("Error in handlePlaceSelect:", error);
      toast.error("Error setting up review link");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("nfc_codes")
        .update({
          title,
          description,
          type: "review",
        })
        .eq("code", code);

      if (error) throw error;

      toast.success("Review plaque updated successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error updating review plaque:", error);
      toast.error("Failed to update review plaque");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Review Plaque</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Business Search</Label>
              <PlaceSearch onPlaceSelect={handlePlaceSelect} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Review Plaque"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};