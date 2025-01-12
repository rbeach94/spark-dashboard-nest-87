import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface PlaceSearchProps {
  onPlaceSelect: (placeId: string, placeName: string) => void;
}

export const PlaceSearch = ({ onPlaceSelect }: PlaceSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [places, setPlaces] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    const searchPlaces = async () => {
      if (!searchTerm || searchTerm.length < 3) {
        setPlaces([]);
        return;
      }

      setIsLoading(true);
      setConfigError(false);
      try {
        console.log('Fetching API key from secrets...');
        const { data: secretData, error: secretError } = await supabase
          .functions.invoke('get-secret', {
            body: { name: 'GOOGLE_PLACES_API_KEY' }
          });

        if (secretError) {
          console.error('Error fetching API key:', secretError);
          setConfigError(true);
          toast.error('Error setting up search');
          return;
        }

        if (!secretData?.value) {
          console.error('API key not found in response:', secretData);
          setConfigError(true);
          toast.error('Search configuration is incomplete');
          return;
        }

        console.log('Making request to Places API...');
        const response = await fetch(
          `https://places.googleapis.com/v1/places:searchText`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': secretData.value,
              'X-Goog-FieldMask': 'places.id,places.displayName'
            },
            body: JSON.stringify({
              textQuery: searchTerm
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Places API error: ${response.statusText}`);
        }

        const responseData = await response.json();
        console.log('Places API response:', responseData);
        
        if (responseData.places) {
          setPlaces(responseData.places.map((place: any) => ({
            id: place.id,
            name: place.displayName.text
          })));
        } else {
          setPlaces([]);
        }
      } catch (error) {
        console.error('Error searching places:', error);
        toast.error('Failed to search places');
        setConfigError(true);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimeout = setTimeout(searchPlaces, 500);
    return () => clearTimeout(debounceTimeout);
  }, [searchTerm]);

  return (
    <div className="space-y-4">
      {configError && (
        <Alert variant="destructive">
          <AlertDescription>
            The search feature is not configured properly. Please try refreshing the page or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      )}
      <div className="relative">
        <Input
          placeholder="Search for your business..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {isLoading && (
          <div className="absolute right-2 top-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      {places.length > 0 && (
        <Select onValueChange={(value) => {
          const place = places.find(p => p.id === value);
          if (place) {
            onPlaceSelect(place.id, place.name);
          }
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Select your business" />
          </SelectTrigger>
          <SelectContent>
            {places.map((place) => (
              <SelectItem key={place.id} value={place.id}>
                {place.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {!isLoading && searchTerm.length > 0 && searchTerm.length < 3 && (
        <p className="text-sm text-muted-foreground">
          Type at least 3 characters to search
        </p>
      )}
    </div>
  );
};