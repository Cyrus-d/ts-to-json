import * as ts from "typescript";
import { Context } from "../NodeParser";
import { SubNodeParser } from "../SubNodeParser";
import { BaseType } from "../Type/BaseType";
import { UnknownType } from "../Type/UnknownType";
import { UnknownNodeError } from "../Error/UnknownNodeError";
import { Config } from "../Config";

export class NotKnownNodeParser implements SubNodeParser {
    public constructor(private config: Config) {}
    public supportsNode(node: ts.Node): boolean {
        if (!this.config.handleUnknownTypes) return false;
        if (this.config.showUnknownTypeInfo) {
            throw new UnknownNodeError(node);
        }
        return true;
    }
    public createType(node: ts.TypeQueryNode, context: Context): BaseType {
        return new UnknownType();
    }
}
