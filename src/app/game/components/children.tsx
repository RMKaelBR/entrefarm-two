import { subCurrency } from "@/game-data/money/calculate-money";
import { QUARTERLY_TUITION_COST, TuitionDecision } from "@/game-data/types";
import { useGameStore } from "@/state/game-state";
import { Button } from "./button";

const tuitionStatus: Record<TuitionDecision, string> = {
    pending: "Decision pending",
    paid: "Paid this quarter",
    opted_out: "Opted out this quarter",
};

export const ChildrenComponent = () => {
    const childCards = useGameStore((state) => state.children);
    const payChildTuition = useGameStore((state) => state.payChildTuition);
    const optOutChildEducation = useGameStore((state) => state.optOutChildEducation);
    const pauseChildEducation = useGameStore((state) => state.pauseChildEducation);
    const resumeChildEducation = useGameStore((state) => state.resumeChildEducation);
    const wallet = useGameStore((state) => state.wallet);
    const remainingAfterTuition = subCurrency(wallet, QUARTERLY_TUITION_COST);
    const canAffordTuition =
        remainingAfterTuition.gold >= 0 && remainingAfterTuition.silver >= 0;

    return (
        <section>
            <div className="font-semibold mt-2">Children:</div>
            <div className="flex gap-4">
                {childCards.map((child) => {
                    const hasActiveEducation =
                        child.stage === "adult_child"
                        && Boolean(child.education)
                        && child.education!.progress < child.education!.progressMax;
                    const hasCompletedEducation =
                        child.education
                        && child.education.progress >= child.education.progressMax;

                    return (
                        <div key={child.id} className="border rounded p-2 bg-white">
                            <div>ID: {child.id}</div>
                            <div>Name: {child.name || "Unnamed"}</div>
                            <div>Stage: {child.stage}</div>
                            <div>Maturity: {child.maturity.timeTokens} / {child.maturity.timeTokensMax}</div>
                            {child.stage === "adult_child" && (
                                <div className="space-y-2">
                                    <div>Profession: {child.profession}</div>
                                    <div>
                                        Education Progress: {child.education
                                            ? `${child.education.progress} / ${child.education.progressMax}`
                                            : "N/A"}
                                    </div>

                                    {hasCompletedEducation && (
                                        <div className="text-sm text-emerald-700">
                                            Education completed
                                        </div>
                                    )}

                                    {hasActiveEducation && child.tuitionDecision && (
                                        <>
                                            <div>
                                                Tuition: {QUARTERLY_TUITION_COST.gold} gold / quarter
                                            </div>
                                            <div>
                                                Tuition Status: {tuitionStatus[child.tuitionDecision]}
                                            </div>

                                            {child.tuitionDecision === "pending" && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="primary"
                                                        disabled={!canAffordTuition}
                                                        label={canAffordTuition ? "Pay 4 Gold" : "Need 4 Gold"}
                                                        onClick={() => payChildTuition(child.id)}
                                                    />
                                                    <Button
                                                        variant="secondary"
                                                        label="Opt Out This Quarter"
                                                        onClick={() => optOutChildEducation(child.id)}
                                                    />
                                                </div>
                                            )}

                                            {child.tuitionDecision === "paid" && (
                                                child.isStudying ? (
                                                    <Button
                                                        variant="warning"
                                                        label="Pause Studies"
                                                        onClick={() => pauseChildEducation(child.id)}
                                                    />
                                                ) : (
                                                    <Button
                                                        variant="primary"
                                                        label="Resume Studies"
                                                        onClick={() => resumeChildEducation(child.id)}
                                                    />
                                                )
                                            )}

                                            {child.tuitionDecision === "opted_out" && (
                                                <p className="text-sm text-stone-600">
                                                    Opted out for this quarter. This decision resets next quarter.
                                                </p>
                                            )}

                                            <div className="text-sm text-stone-700">
                                                Study Status: {child.isStudying
                                                    ? "Currently studying"
                                                    : "Studies paused"}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
