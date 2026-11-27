using RentFlow.Domain.Enums;

namespace RentFlow.Application.Modules.Contracts.Common;

public enum ContractAction { Activate, Complete, Terminate }

public static class ContractStatusRules
{
    public static ContractStatus? Apply(ContractStatus current, ContractAction action) => (current, action) switch
    {
        (ContractStatus.Draft, ContractAction.Activate) => ContractStatus.Active,
        (ContractStatus.Active, ContractAction.Complete) => ContractStatus.Completed,
        (ContractStatus.Draft or ContractStatus.Active, ContractAction.Terminate) => ContractStatus.Terminated,
        _ => null
    };
}