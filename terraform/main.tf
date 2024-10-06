terraform {
  backend "remote" {
    # Org of Doom! 1
    organization = "org-of-doom"

    # The name of the Terraform Cloud workspace to store Terraform state files in.
    workspaces {
      name = "like-project"
    }
  }
}

# An example resource that does nothing.
resource "null_resource" "example" {
  triggers = {
    value = "A example resource that does nothing!"
  }
}
