export function Flash({ saved, error }: { saved?: string; error?: string }) {
  if (error) return <p className="flash error" role="alert">{error}</p>;
  if (saved) return <p className="flash" role="status">{saved}</p>;
  return null;
}
