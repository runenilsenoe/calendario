-- Export design chosen in the preview (layout, palette, toggles), shared with the public link.
ALTER TABLE events ADD COLUMN poster_options JSONB NOT NULL DEFAULT '{}'::jsonb;
