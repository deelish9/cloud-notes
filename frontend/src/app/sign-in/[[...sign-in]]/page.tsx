import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#ffffff",
            colorText: "white",
            colorBackground: "#09090b",
            colorInputBackground: "#27272a",
            colorInputText: "white",
            colorTextSecondary: "#a1a1aa",
          },
          elements: {
            card: {
              backgroundColor: "#18181b",
              borderColor: "#27272a",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            },
            headerTitle: { color: "white" },
            headerSubtitle: { color: "#a1a1aa" },
            socialButtonsBlockButton: {
              backgroundColor: "#27272a",
              borderColor: "#3f3f46",
              color: "white"
            },
            dividerLine: { background: "#3f3f46" },
            dividerText: { color: "#71717a" },
            formFieldLabel: { color: "#d4d4d8" },
            formFieldInput: {
              backgroundColor: "#27272a",
              borderColor: "#3f3f46",
              color: "white"
            },
            footerActionText: { color: "#a1a1aa" },
            footerActionLink: { color: "white", fontWeight: "600" }
          }
        }}
      />
    </main>
  );
}
