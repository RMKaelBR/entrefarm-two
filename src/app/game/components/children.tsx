import { useGameStore } from "@/state/game-state";
import { subCurrency } from "@/game-data/money/calculate-money";
import { QUARTERLY_TUITION_COST } from "@/game-data/types";
import { Button } from "./button";

export const ChildrenComponent = () => {
    const childCards = useGameStore((state) => state.children);
    const pauseChildEducation = useGameStore((state) => state.pauseChildEducation);
    const resumeChildEducation = useGameStore((state) => state.resumeChildEducation);
    const month = useGameStore((state) => state.month);
    const wallet = useGameStore((state) => state.wallet);
    const isQuarterStart = month % 3 === 1;

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
                                <div className="space-y-2">
                                    <div>Profession: {child.profession}</div>
                                    <div>Education Progress: {child.education ? `${child.education.progress} / ${child.education.progressMax}` : "N/A"}</div>
                                    <div>Tuition: {QUARTERLY_TUITION_COST.gold} gold / quarter</div>
                                    <div>
                                        Tuition Status: {child.tuitionCommittedForQuarter ? "Paid this quarter" : "Unpaid"}
                                    </div>
                                    {child.education && !child.tuitionCommittedForQuarter && (
                                        <div className="text-sm text-stone-600">
                                            {isQuarterStart
                                                ? (subCurrency(wallet, QUARTERLY_TUITION_COST).gold >= 0
                                                    ? "Quarter start: pay tuition to continue studies."
                                                    : `Need ${QUARTERLY_TUITION_COST.gold} gold in your wallet to resume.`)
                                                : "Next tuition decision opens at the start of the next quarter."}
                                        </div>
                                    )}
                                    {child.isStudying ? (
                                        <Button variant="warning" label="Pause Studies" onClick={() => pauseChildEducation(child.id)} />
                                    ) : (
                                        <Button
                                            variant={child.tuitionCommittedForQuarter || isQuarterStart ? "primary" : "secondary"}
                                            disabled={
                                                !child.tuitionCommittedForQuarter
                                                && (!isQuarterStart || subCurrency(wallet, QUARTERLY_TUITION_COST).gold < 0)
                                            }
                                            label={
                                                child.tuitionCommittedForQuarter
                                                    ? "Resume Studies"
                                                    : (subCurrency(wallet, QUARTERLY_TUITION_COST).gold >= 0
                                                        ? "Pay 4 Gold To Resume"
                                                        : "Need 4 Gold")
                                            }
                                            onClick={() => resumeChildEducation(child.id)}
                                        />
                                    )}
                                    <div className="flex flex-col mt-4 gap-1 text-sm text-stone-700">
                                        <span>Study Status: {child.isStudying ? "Currently studying" : "Studies paused"}</span>
                                        <span>Decision Window: {isQuarterStart ? "Open this month" : "Closed until next quarter"}</span>
                                    </div>
                                </div>
                                
                            )}
                        </div>
                    ))}
                </div>
        </section>
    );
};
