import { useGameStore } from "@/state/game-state";
import { Button } from "./button";

export const ChildrenComponent = () => {
    const childCards = useGameStore((state) => state.children);
    const pauseChildEducation = useGameStore((state) => state.pauseChildEducation);
    const resumeChildEducation = useGameStore((state) => state.resumeChildEducation);

    return (
        <section>
            <div className="font-semibold mt-2">Children:</div>
                <div className="flex gap-4">
                    {childCards.map((child) => (
                        <div key={child.id} className="border rounded p-2 bg-white">
                            <div>ID: {child.id}</div>
                            <div>Name: {child.name || "Unnamed"}</div>
                            <div>Stage: {child.stage}</div>
                            <div>Maturity: {child.maturity.timeTokens} / {child.maturity.timeTokensMax}</div>
                            {child.stage === "adult_child" && (
                                <div>
                                    <div>Profession: {child.profession}</div>
                                    {child.isStudying ? (
                                        <Button variant="warning" label="Pause Studies" onClick={() => pauseChildEducation(child.id)} />
                                    ) : (
                                        <Button variant="primary" label="Resume Studies" onClick={() => resumeChildEducation(child.id)} />
                                    )}
                                    {/* ONLY FOR THE LULZZZ */}
                                    <div className="flex flex-col mt-4 gap-2"> 
                                        <span>child is good: {child.isStudying ? "Yes 👍" : "NO 😠"}</span>
                                        <span>child is a bum: {child.isStudying ? "No" : "Yes"}</span>
                                    </div>
                                </div>
                                
                            )}
                        </div>
                    ))}
                </div>
        </section>
    );
};
