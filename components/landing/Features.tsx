import { Shield, BookOpen, Clock, Lock, Scale, Zap } from 'lucide-react';

const features = [
    {
        title: "Privacy First",
        description: "Your files are processed in memory and never stored on our servers. What you upload is your business.",
        icon: Shield,
        color: "bg-green-100 text-green-700"
    },
    {
        title: "Indian Law Context",
        description: "Analysis based on the Indian Contract Act, 1872 and other relevant Indian statutes.",
        icon: Scale,
        color: "bg-blue-100 text-blue-700"
    },
    {
        title: "Instant Results",
        description: "Get a comprehensive breakdown of risks and clauses in seconds, not days.",
        icon: Zap,
        color: "bg-yellow-100 text-yellow-700"
    },
    {
        title: "Risk Assessment",
        description: "Automatically identifies predatory clauses and potential legal pitfalls.",
        icon: Lock,
        color: "bg-red-100 text-red-700"
    },
    {
        title: "Simple English",
        description: "Legal jargon explained in plain, easy-to-understand language.",
        icon: BookOpen,
        color: "bg-purple-100 text-purple-700"
    },
    {
        title: "24/7 Availability",
        description: "Access your personal legal assistant anytime, anywhere.",
        icon: Clock,
        color: "bg-orange-100 text-orange-700"
    }
];

export default function Features() {
    return (
        <section id="features" className="py-20 md:py-24 bg-secondary/5">
            {/* Container: matches 1200px rule */}
            <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8">

                {/* Header - Left Aligned to match Hero */}
                <div className="max-w-3xl mb-16 text-left">
                    <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
                        Why Choose Andhakanoon?
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
                        We combine advanced AI with deep legal knowledge to empower you with the clarity you deserve.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="bg-background p-6 md:p-8 rounded-2xl border border-border hover:border-border/80 shadow-sm transition-all duration-200"
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${feature.color}`}>
                                <feature.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
