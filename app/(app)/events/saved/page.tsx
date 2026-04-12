import { redirect } from "next/navigation"

export default function SavedEventsRedirect() {
  redirect("/my-events?tab=saved")
}
