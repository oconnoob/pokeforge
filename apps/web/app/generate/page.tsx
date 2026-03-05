import { redirect } from "next/navigation";
import { CREATE_PAGE_PATH } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function GeneratePageRedirect() {
  redirect(CREATE_PAGE_PATH);
}
