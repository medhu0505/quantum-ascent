import { createFileRoute } from "@tanstack/react-router";
import { RegisterInterior } from "@/components/interiors/RegisterInterior";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/register/")({
  head: () =>
    seo({
      title: "Register",
      description:
        "Register for Quantum V2.0. One form covers every event — classes 9 to 12, any participating school, and you can enter as many events as you can attend.",
      path: "/register",
    }),
  component: RegisterInterior,
});
