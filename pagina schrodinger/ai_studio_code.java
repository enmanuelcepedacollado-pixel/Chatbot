package com.example;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.genai.Client;
import com.google.genai.JsonSerializable;
import com.google.genai.gaos.models.interactions.*;
import com.google.genai.gaos.models.operations.*;
import java.util.Optional;

public class  {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("GEMINI_API_KEY");
        Client client = Client.builder().apiKey(apiKey).build();

        CreateAgentInteraction.Builder paramsBuilder =
            CreateAgentInteraction.builder()
                .agent("antigravity-preview-09-2026");

        paramsBuilder = paramsBuilder.input(InteractionsInput.of("INSERT_INPUT_HERE"));
        paramsBuilder = paramsBuilder.background(true);
        paramsBuilder = paramsBuilder.tools(ImmutableList.of(
            CodeExecution.builder().build(),
            GoogleSearch.builder().build(),
            URLContext.builder().build()
        ));
        paramsBuilder = paramsBuilder.environment(
            CreateAgentInteractionEnvironment.of(
                Environment.builder()
                    .network(Network.of(
                        EnvironmentNetworkEgressAllowlist.of(
                            Allowlist.builder()
                                .allowlist(ImmutableList.of(
                                    AllowlistEntry.builder()
                                        .domain("generativelanguage.googleapis.com")
                                        .transform(Transform.of(ImmutableList.of(
                                            ImmutableMap.of("x-goog-api-key", "GEMINI_API_KEY")
                                        )))
                                        .build()
                                ))
                                .build()
                        )
                    ))
                    .build()
            )
        );
        CreateAgentInteraction params = paramsBuilder.build();
        CreateInteractionResponse response =
            client.interactions.create(CreateInteractionRequestBody.of(params));

        Interaction interaction = response.interaction().orElseThrow(() -> new RuntimeException("No interaction returned"));
        System.out.println("Research started: " + interaction.id().orElse(""));

        while (true) {
            GetInteractionByIdResponse getResponse = client.interactions.get(new GetInteractionByIdRequest(interaction.id().orElseThrow()));
            Interaction result = getResponse.interaction().orElseThrow(() -> new RuntimeException("No interaction returned"));
            if (result.status().equals(Optional.of(InteractionStatus.COMPLETED))) {
                System.out.println(result.outputText().orElse(""));
                break;
            } else if (result.status().equals(Optional.of(InteractionStatus.FAILED))) {
                System.out.println("Research failed.");
                break;
            }
            try {
                Thread.sleep(10000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
}


