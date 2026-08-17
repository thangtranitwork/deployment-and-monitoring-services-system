package service

import (
	"strings"
)

type MatchResult struct {
	MatchedName string   `json:"matched_name"`
	IsAmbiguous bool     `json:"is_ambiguous"`
	Candidates  []string `json:"candidates"`
}

func MatchServiceByName(query string, availableServices []string) MatchResult {
	q := strings.TrimSpace(strings.ToLower(query))
	if q == "" {
		return MatchResult{Candidates: availableServices}
	}

	// 1. Exact match
	for _, svc := range availableServices {
		if strings.ToLower(svc) == q {
			return MatchResult{MatchedName: svc}
		}
	}

	// 2. Contains match
	var matches []string
	for _, svc := range availableServices {
		if strings.Contains(strings.ToLower(svc), q) {
			matches = append(matches, svc)
		}
	}

	if len(matches) == 1 {
		return MatchResult{MatchedName: matches[0]}
	}

	if len(matches) > 1 {
		return MatchResult{
			IsAmbiguous: true,
			Candidates:  matches,
		}
	}

	return MatchResult{Candidates: nil}
}
