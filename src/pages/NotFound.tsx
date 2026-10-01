import { Link } from "react-router-dom";
import BrandMark from "@/components/BrandMark";

const NotFound = () => (
  <main className="flex min-h-screen items-center justify-center px-5">
    <div className="space-y-4 text-center">
      <BrandMark className="mx-auto" />
      <h1 className="text-2xl font-semibold tracking-tight">This path doesn't go anywhere</h1>
      <p className="text-muted-foreground">The page you were looking for isn't here.</p>
      <Link
        to="/"
        className="inline-flex h-11 items-center rounded-md px-4 font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Back to the challenge
      </Link>
    </div>
  </main>
);

export default NotFound;
