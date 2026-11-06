package com.wallet;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packages = "com.wallet", importOptions = ImportOption.DoNotIncludeTests.class)
class HexagonalArchitectureTest {

    @ArchTest
    static final ArchRule domainDoesNotDependOnSpring = noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAPackage("org.springframework..");

    @ArchTest
    static final ArchRule domainDoesNotDependOnAdaptersOrApplication = noClasses()
            .that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage("..adapters..", "..application..");

    @ArchTest
    static final ArchRule onboardingCoreDoesNotKnowTheWalletModule = noClasses()
            .that().resideInAnyPackage("com.wallet.onboarding.domain..", "com.wallet.onboarding.application..")
            .should().dependOnClassesThat().resideInAPackage("com.wallet.wallet..");

    @ArchTest
    static final ArchRule walletDoesNotKnowTheOnboardingModule = noClasses()
            .that().resideInAPackage("com.wallet.wallet..")
            .should().dependOnClassesThat().resideInAPackage("com.wallet.onboarding..");
}
