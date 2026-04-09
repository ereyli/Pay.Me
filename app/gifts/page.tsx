import { redirect } from "next/navigation";

/** Legacy path */
export default function GiftsIndexRedirect() {
  redirect("/activity");
}
