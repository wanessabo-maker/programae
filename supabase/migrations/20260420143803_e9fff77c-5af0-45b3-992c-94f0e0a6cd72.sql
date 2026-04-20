ALTER TABLE public.store_cleanliness_checks DROP CONSTRAINT IF EXISTS store_cleanliness_checks_rating_check;
ALTER TABLE public.store_cleanliness_checks ALTER COLUMN rating TYPE numeric(2,1) USING rating::numeric(2,1);
ALTER TABLE public.store_cleanliness_checks ADD CONSTRAINT store_cleanliness_checks_rating_check CHECK (rating >= 0 AND rating <= 5);