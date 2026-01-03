// App wrapper with WorkOS authentication providers
// This file is only loaded when WorkOS environment variables are configured
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { workosConfig } from "./utils/workos";
import App from "./App";

interface AppWithWorkOSProps {
  convex: ConvexReactClient;
}

export default function AppWithWorkOS({ convex }: AppWithWorkOSProps) {
  return (
    <AuthKitProvider
      clientId={workosConfig.clientId}
      redirectUri={workosConfig.redirectUri}
    >
      <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithAuthKit>
    </AuthKitProvider>
  );
}
