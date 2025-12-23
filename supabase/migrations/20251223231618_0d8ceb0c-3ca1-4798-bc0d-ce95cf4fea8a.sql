-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table to cache geocoded coordinates for properties
CREATE TABLE public.property_geocodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_code INTEGER NOT NULL UNIQUE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_approximate BOOLEAN NOT NULL DEFAULT false,
  geocoded_address TEXT,
  source TEXT DEFAULT 'mapbox',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.property_geocodes ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (anyone can read geocoded data)
CREATE POLICY "Anyone can read property geocodes" 
ON public.property_geocodes 
FOR SELECT 
USING (true);

-- Create index for fast lookups by property code
CREATE INDEX idx_property_geocodes_code ON public.property_geocodes(property_code);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_property_geocodes_updated_at
BEFORE UPDATE ON public.property_geocodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();