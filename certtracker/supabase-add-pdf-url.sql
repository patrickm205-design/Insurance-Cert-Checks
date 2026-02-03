-- Add pdf_url column to certificates table
ALTER TABLE certificates
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_certificates_pdf_url
ON certificates(pdf_url)
WHERE pdf_url IS NOT NULL;
