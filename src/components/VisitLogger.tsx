"use client";

import { useEffect } from "react";

interface VisitLoggerProps {
  page: string;
}

export default function VisitLogger({ page }: VisitLoggerProps) {
  useEffect(() => {
    fetch(`/api/log-visit?page=${encodeURIComponent(page)}`).catch((err) =>
      console.error("Failed to log visit:", err)
    );
  }, [page]);

  return null;
}
