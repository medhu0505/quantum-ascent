import { createFileRoute } from "@tanstack/react-router";
import { RegisterInterior } from "@/components/interiors/RegisterInterior";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/register/")({
  head: () =>
    seo({
      title: "Register",
      description:
        "Register your school for Quantum V2.0. One form covers every event — classes 9 to 12, any participating school, more than one team per event allowed.",
      path: "/register",
    }),
  component: RegisterInterior,
});
