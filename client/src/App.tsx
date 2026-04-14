import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminRoute } from "@/components/AdminRoute";
import AdminAddProduct from "@/pages/AdminAddProduct";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminLogin from "@/pages/AdminLogin";
import HomePage from "@/pages/HomePage";
import ProductDetail from "@/pages/ProductDetail";
import MyProfile from "@/pages/MyProfile";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFail from "@/pages/PaymentFail";
import TermsPage from "@/pages/TermsPage";
import AboutPage from "@/pages/AboutPage";
import LiveContactPage from "@/pages/LiveContactPage";
import NotFound from "@/pages/not-found";
import { CartContext, useCartProvider } from "@/hooks/use-cart";
import { AdminChatWidget } from "@/components/AdminChatWidget";
import { BroadcastNotification } from "@/components/BroadcastNotification";
import { useEffect } from "react";

function useOnlinePing() {
  useEffect(() => {
    let sid = sessionStorage.getItem("_sid");
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      sessionStorage.setItem("_sid", sid);
    }
    const ping = () => fetch(`/api/ping?sid=${sid}`, { method: "POST" }).catch(() => {});
    ping();
    const iv = setInterval(ping, 30_000);
    return () => clearInterval(iv);
  }, []);
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/product/:id" component={ProductDetail} />
      <Route path="/profile" component={MyProfile} />
      <Route path="/payment/success" component={PaymentSuccess} />
      <Route path="/payment/fail" component={PaymentFail} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/live-contact" component={LiveContactPage} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/admin-dashboard">
        <AdminRoute component={AdminDashboard} />
      </Route>
      <Route path="/admin-add">
        <AdminRoute component={AdminAddProduct} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const cart = useCartProvider();
  useOnlinePing();
  return (
    <QueryClientProvider client={queryClient}>
      <CartContext.Provider value={cart}>
        <TooltipProvider>
          <Router />
          <AdminChatWidget />
          <BroadcastNotification />
          <Toaster />
        </TooltipProvider>
      </CartContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
