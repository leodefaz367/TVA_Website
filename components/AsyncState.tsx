export function AsyncState({
  loading,
  error,
  retry,
}: {
  loading?: boolean;
  error?: string;
  retry?: () => void;
}) {
  if (loading)
    return (
      <div className="notice" role="status">
        Cargando…
      </div>
    );
  if (error)
    return (
      <div className="notice error" role="alert">
        <p>{error}</p>
        {retry && (
          <button className="button button-primary" onClick={retry}>
            Reintentar
          </button>
        )}
      </div>
    );
  return null;
}
