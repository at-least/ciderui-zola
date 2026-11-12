// checkmarkup runs ciderui.CheckMarkup on each HTML file named, printing
// "<file>: <problem>" for each problem; it exits 1 if there is any.
package main

import (
	"fmt"
	"os"

	"github.com/at-least/ciderui"
)

func main() {
	found := false
	for _, path := range os.Args[1:] {
		html, err := os.ReadFile(path)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(2)
		}
		for _, problem := range ciderui.CheckMarkup(string(html)) {
			fmt.Printf("%s: %s\n", path, problem)
			found = true
		}
	}
	if found {
		os.Exit(1)
	}
}
