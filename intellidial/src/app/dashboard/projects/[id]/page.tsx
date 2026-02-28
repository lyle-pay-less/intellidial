"use client";

import { useParams } from "next/navigation";
import { ProjectDetailContent } from "./ProjectDetailContent";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  return <ProjectDetailContent projectId={id} />;
}
