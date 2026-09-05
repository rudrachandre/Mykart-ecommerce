import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/animations/fade-in";
import { SlideIn } from "@/components/animations/slide-in";

export default function DesignSystemPage() {
  return (
    <div className="container mx-auto max-w-4xl p-8 space-y-16">
      <FadeIn>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">MyKart Design System</h1>
          <p className="text-muted-foreground text-lg">
            A premium, clean, and accessible foundation for MyKart.
          </p>
        </div>
      </FadeIn>

      <SlideIn delay={0.1}>
        <section className="space-y-6">
          <h2 className="text-2xl font-medium border-b pb-2">Typography & Colors</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-xl bg-background border shadow-sm space-y-2">
              <div className="text-sm text-muted-foreground">Background</div>
              <div className="text-lg font-medium text-foreground">Foreground Text</div>
            </div>
            <div className="p-6 rounded-xl bg-primary border shadow-sm space-y-2">
              <div className="text-sm text-primary-foreground/80">Primary</div>
              <div className="text-lg font-medium text-primary-foreground">Primary Text</div>
            </div>
            <div className="p-6 rounded-xl bg-secondary border shadow-sm space-y-2">
              <div className="text-sm text-secondary-foreground/80">Secondary</div>
              <div className="text-lg font-medium text-secondary-foreground">Secondary Text</div>
            </div>
            <div className="p-6 rounded-xl bg-muted border shadow-sm space-y-2">
              <div className="text-sm text-muted-foreground">Muted</div>
              <div className="text-lg font-medium text-foreground">Muted Text</div>
            </div>
          </div>
        </section>
      </SlideIn>

      <SlideIn delay={0.2}>
        <section className="space-y-6">
          <h2 className="text-2xl font-medium border-b pb-2">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="default">Default Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="destructive">Destructive Button</Button>
            <Button variant="link">Link Button</Button>
          </div>
        </section>
      </SlideIn>

      <SlideIn delay={0.3}>
        <section className="space-y-6">
          <h2 className="text-2xl font-medium border-b pb-2">Inputs & Forms</h2>
          <div className="max-w-sm space-y-4">
            <Input placeholder="Enter your email" type="email" />
            <Input placeholder="Search products..." type="search" />
            <Input placeholder="Disabled input" disabled />
          </div>
        </section>
      </SlideIn>

      <SlideIn delay={0.4}>
        <section className="space-y-6">
          <h2 className="text-2xl font-medium border-b pb-2">Badges</h2>
          <div className="flex flex-wrap gap-4">
            <Badge variant="default">New Arrival</Badge>
            <Badge variant="secondary">Out of Stock</Badge>
            <Badge variant="outline">Premium</Badge>
            <Badge variant="destructive">Sale</Badge>
          </div>
        </section>
      </SlideIn>

      <SlideIn delay={0.5}>
        <section className="space-y-6">
          <h2 className="text-2xl font-medium border-b pb-2">Loading States (Skeleton)</h2>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        </section>
      </SlideIn>

    </div>
  );
}
