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

interface PlaceSearchProps {
  onPlaceSelect: (placeId: string, placeName: string) => void;
}

export const PlaceSearch = ({ onPlaceSelect }: PlaceSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [places, setPlaces] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const searchPlaces = async () => {
      if (!searchTerm || searchTerm.length < 3) {
        setPlaces([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .functions.invoke('get-secret', {
            body: { name: 'GOOGLE_PLACES_API_KEY' }
          });

        if (error) {
          console.error('Error fetching API key:', error);
          toast.error('Error setting up search');
          return;
        }

        if (!data?.GOOGLE_PLACES_API_KEY) {
          console.error('API key not found');
          toast.error('Search configuration is incomplete');
          return;
        }

        const response = await fetch(
          `https://places.googleapis.com/v1/places:searchText`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': data.GOOGLE_PLACES_API_KEY,
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
        if (responseData.places) {
          setPlaces(responseData.places.map((place: any) => ({
            id: place.id,
            name: place.displayName.text
          })));
        }
      } catch (error) {
        console.error('Error searching places:', error);
        toast.error('Failed to search places');
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimeout = setTimeout(searchPlaces, 500);
    return () => clearTimeout(debounceTimeout);
  }, [searchTerm]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search for your business..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
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
      {isLoading && <p className="text-sm text-muted-foreground">Searching...</p>}
    </div>
  );
};