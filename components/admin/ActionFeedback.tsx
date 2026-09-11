export default function ActionFeedback({
  error,
  message,
}: {
  error: string;
  message: string;
}) {
  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice success" role="status">
          {message}
        </p>
      )}
    </>
  );
}
