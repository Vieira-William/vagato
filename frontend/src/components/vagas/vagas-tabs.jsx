import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function VagasTabs({ activeTab, setActiveTab, TABS, getCountByTab }) {
    return (
        <div className="px-6 py-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-transparent h-auto p-0 gap-2 flex-wrap justify-start">
                    {TABS.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className={cn(
                                "h-10 px-6 rounded-full text-xs font-semibold transition-all gap-2 border border-transparent shadow-none capitalize",
                                "data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-soft",
                                "data-[state=inactive]:hover:bg-muted/50 data-[state=inactive]:text-muted-foreground"
                            )}
                        >
                            {tab.label}
                            <Badge
                                variant="outline"
                                className={cn(
                                    "ml-1 rounded-full px-1.5 h-5 min-w-[20px] border-none text-[10px]",
                                    activeTab === tab.id ? "bg-accent-foreground/20 text-accent-foreground" : "bg-muted text-muted-foreground"
                                )}
                            >
                                {getCountByTab(tab.id)}
                            </Badge>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        </div>
    );
}
