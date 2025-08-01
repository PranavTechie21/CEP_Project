import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { loginSchema, type LoginData } from "@shared/schema";
import { Shield, Building, User } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string>("");

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    // Pre-fill admin credentials
    if (role === "admin") {
      form.setValue("email", "admin123");
      form.setValue("password", "admin@123");
    } else {
      form.setValue("email", "");
      form.setValue("password", "");
    }
  };

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      toast({
        title: "Welcome back!",
        description: "You have been logged in successfully.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Choose Login Type</CardTitle>
            <CardDescription className="text-center">
              Select your role to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={() => handleRoleSelect("admin")}
              className="w-full h-16 flex items-center justify-center space-x-3 bg-red-600 hover:bg-red-700"
            >
              <Shield className="h-6 w-6" />
              <span className="text-lg">Admin Login</span>
            </Button>
            
            <Button
              onClick={() => handleRoleSelect("employer")}
              className="w-full h-16 flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700"
            >
              <Building className="h-6 w-6" />
              <span className="text-lg">Employer Login</span>
            </Button>
            
            <Button
              onClick={() => handleRoleSelect("job_seeker")}
              className="w-full h-16 flex items-center justify-center space-x-3 bg-green-600 hover:bg-green-700"
            >
              <User className="h-6 w-6" />
              <span className="text-lg">Employee Login</span>
            </Button>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {selectedRole === "admin" && "Admin Login"}
              {selectedRole === "employer" && "Employer Login"} 
              {selectedRole === "job_seeker" && "Employee Login"}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRole("")}
            >
              Back
            </Button>
          </div>
          <CardDescription>
            {selectedRole === "admin" && "Access admin dashboard"}
            {selectedRole === "employer" && "Manage your job postings"}
            {selectedRole === "job_seeker" && "Find your next opportunity"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedRole === "admin" ? "Username" : "Email"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type={selectedRole === "admin" ? "text" : "email"}
                        placeholder={selectedRole === "admin" ? "Enter username" : "Enter your email"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
