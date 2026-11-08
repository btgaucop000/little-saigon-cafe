/** Short-lived confirmation; fades out via CSS so it needs no timers. */
export function Toast({ message }: { message: string }) {
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}
