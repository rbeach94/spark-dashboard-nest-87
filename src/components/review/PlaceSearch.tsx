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
        const { data: { GOOGLE_PLACES_API_KEY } } = await supabase
          .functions.invoke('get-secret', {
            body: { name: 'GOOGLE_PLACES_API_KEY' }
          });

        const response = await fetch(
          `https://places.googleapis.com/v1/places:searchText`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
              'X-Goog-FieldMask': 'places.id,places.displayName'
            },
            body: JSON.stringify({
              textQuery: searchTerm
            })
          }
        );

        const data = await response.json();
        if (data.places) {
          setPlaces(data.places.map((place: any) => ({
            id: place.id,
            name: place.displayName.text
          })));
        }
      } catch (error) {
        console.error('Error searching places:', error);
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